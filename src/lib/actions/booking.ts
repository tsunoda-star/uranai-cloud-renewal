"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ConsultationMethod, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

/**
 * 予約リクエスト作成 Server Action（spec §4.1, AC-B7-1/2, REL-2）.
 *
 * 不変条件:
 * - RBAC: 認証済みユーザーのみ（spec §3: 予約送信は 3 ロール可だが導線は一般）。
 *   未認証は呼び出し側で /login?returnTo へ誘導するが、ここでも再検証（多層防御 SEC-2）。
 * - 対象妥当性: 占い師は実在＆公開、相談形式は当該占い師が提供する method のみ、
 *   サービス指定時は当該占い師の公開サービスのみ（client 値を信頼しない）。
 * - 要配慮情報: summary はサニタイズして保存（§12）。ログに PII を出さない。
 * - レート制限: 同一 requester の直近 RATE_WINDOW_MIN 分の作成数を DB カウントで
 *   RATE_MAX 件に制限（連投・スパム防止 SEC）。
 * - トランザクション: ConsultationRequest + PreferredSlot + 占い師宛 Notification を
 *   1 トランザクションで作成（部分作成を防ぐ）。
 */

const RATE_WINDOW_MIN = 10;
const RATE_MAX = 5;
const MAX_PREFERRED_SLOTS = 3;
const SUMMARY_MIN = 10;
const SUMMARY_MAX = 2000;

const VALID_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

export interface BookingActionState {
  ok: boolean;
  error?: string;
  /** Field-level messages for inline display (non-PII). */
  fieldErrors?: Partial<Record<"method" | "summary" | "slots" | "service", string>>;
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Parse a datetime-local value ("YYYY-MM-DDTHH:mm") into a future Date, or null. */
function parseFutureSlot(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  // 過去日時は弾く（希望日時候補は未来のみ）。
  if (d.getTime() <= Date.now()) return null;
  return d;
}

/**
 * Server Action bound by the form. On success it redirects to
 * /mypage?booked=1 (確認バナー表示)。失敗時は構造化エラー state を返す。
 */
export async function createBookingRequest(
  _prev: BookingActionState,
  formData: FormData
): Promise<BookingActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const advisorSlug = asString(formData.get("advisorSlug")).trim();
  const methodRaw = asString(formData.get("method")).trim().toUpperCase();
  const serviceIdRaw = asString(formData.get("serviceId")).trim();
  const summaryRaw = asString(formData.get("summary"));
  const slotRaws = [
    asString(formData.get("slot0")),
    asString(formData.get("slot1")),
    asString(formData.get("slot2")),
  ];

  const fieldErrors: BookingActionState["fieldErrors"] = {};

  // 相談形式バリデーション。
  const method = (VALID_METHODS as readonly string[]).includes(methodRaw)
    ? (methodRaw as ConsultationMethod)
    : null;
  if (!method) {
    fieldErrors.method = "相談形式を選択してください。";
  }

  // 相談概要バリデーション + サニタイズ。
  const summaryTrimmedLen = summaryRaw.trim().length;
  if (summaryTrimmedLen < SUMMARY_MIN) {
    fieldErrors.summary = `相談概要は${SUMMARY_MIN}文字以上で入力してください。`;
  } else if (summaryTrimmedLen > SUMMARY_MAX) {
    fieldErrors.summary = `相談概要は${SUMMARY_MAX}文字以内で入力してください。`;
  }
  const summary = sanitizeText(summaryRaw, SUMMARY_MAX);

  // 希望日時候補（最大 3, 未来のみ, 1 件以上必須）。
  const slots: Date[] = [];
  for (const raw of slotRaws) {
    if (!raw.trim()) continue;
    const slot = parseFutureSlot(raw);
    if (!slot) {
      fieldErrors.slots = "希望日時候補は未来の日時を指定してください。";
      break;
    }
    slots.push(slot);
  }
  if (slots.length === 0 && !fieldErrors.slots) {
    fieldErrors.slots = "希望日時候補を1つ以上入力してください。";
  }
  if (slots.length > MAX_PREFERRED_SLOTS) {
    fieldErrors.slots = `希望日時候補は最大${MAX_PREFERRED_SLOTS}件です。`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "入力内容を確認してください。", fieldErrors };
  }

  // 対象占い師の実在・公開チェック + 提供 method / service の妥当性検証。
  const advisor = await db.fortuneTellerProfile.findFirst({
    where: { slug: advisorSlug, isPublished: true },
    select: {
      id: true,
      slug: true,
      userId: true,
      user: { select: { displayName: true } },
      methods: { select: { method: true } },
      services: {
        where: { isPublished: true },
        select: { id: true },
      },
    },
  });
  if (!advisor) {
    return { ok: false, error: "対象の占い師が見つかりませんでした。" };
  }
  if (!advisor.methods.some((m) => m.method === method)) {
    return {
      ok: false,
      error: "この占い師では選択した相談形式を利用できません。",
      fieldErrors: { method: "この占い師が対応していない相談形式です。" },
    };
  }

  // サービス指定は任意。指定時は当該占い師の公開サービスのみ許可。
  let serviceId: string | null = null;
  if (serviceIdRaw) {
    const owned = advisor.services.some((s) => s.id === serviceIdRaw);
    if (!owned) {
      return {
        ok: false,
        error: "指定された鑑定メニューは利用できません。",
        fieldErrors: { service: "この占い師のメニューではありません。" },
      };
    }
    serviceId = serviceIdRaw;
  }

  // レート制限（直近 RATE_WINDOW_MIN 分の作成数を DB カウント）。
  const windowStart = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000);
  const recentCount = await db.consultationRequest.count({
    where: { requesterId: user.id, createdAt: { gte: windowStart } },
  });
  if (recentCount >= RATE_MAX) {
    return {
      ok: false,
      error: `短時間に多くのリクエストが送信されています。${RATE_WINDOW_MIN}分ほど時間をおいて再度お試しください。`,
    };
  }

  // トランザクション: リクエスト + 希望日時 + 占い師宛通知（REL-2）。
  await db.$transaction(async (tx) => {
    const created = await tx.consultationRequest.create({
      data: {
        requesterId: user.id,
        advisorId: advisor.id,
        serviceId,
        method: method as ConsultationMethod,
        summary,
        status: "PENDING",
        preferredSlots: {
          create: slots.map(
            (slot, i): Prisma.ConsultationPreferredSlotCreateWithoutRequestInput => ({
              slot,
              sortOrder: i,
            })
          ),
        },
      },
      select: { id: true },
    });

    // 占い師宛アプリ内通知（AC-B7-6）。本文に要配慮情報（summary）は含めない（§12）。
    await tx.notification.create({
      data: {
        userId: advisor.userId,
        type: "CONSULTATION_STATUS",
        title: "新しい予約リクエストが届きました",
        body: `${user.displayName} さんから予約リクエストが届きました。内容を確認して対応してください。`,
        linkUrl: "/advisor/requests",
      },
    });

    return created;
  });

  // 占い師ダッシュボードの予約一覧を再検証（受信即時反映）。
  revalidatePath("/advisor/requests");
  // 成功は redirect（確認バナーを /mypage で表示）。
  redirect("/mypage?booked=1");
}
