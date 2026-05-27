"use server";

import { revalidatePath } from "next/cache";
import type { ConsultationMethod } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

/**
 * 占い師サービス管理 Server Action（AC-B9-2, spec §3 所有権 SEC-3）.
 *
 * 不変条件:
 * - RBAC (SEC-2): FORTUNE_TELLER / ADMIN のみ。
 * - 所有権 (SEC-3): 編集/削除/公開トグルは「自分の占い師プロフィールに属するサービス」のみ。
 *   serviceId は DB で advisorId を再解決して所有権を検証（client 値を信頼しない）。
 *   ADMIN は全件操作可。
 * - title/description サニタイズ、price/duration/method/category を検証。
 */

const TITLE_MIN = 2;
const TITLE_MAX = 80;
const DESC_MIN = 10;
const DESC_MAX = 2000;
const PRICE_MIN = 0;
const PRICE_MAX = 1_000_000;
const DURATION_MIN = 5;
const DURATION_MAX = 480;

const VALID_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

export interface ServiceActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      "title" | "description" | "method" | "priceJpy" | "durationMin" | "categoryId",
      string
    >
  >;
  saved?: boolean;
  /** 新規作成時の id（フォームリセット判定用）。 */
  createdId?: string;
}

export interface ServiceMutationResult {
  ok: boolean;
  error?:
    | "unauthenticated"
    | "not_advisor"
    | "forbidden"
    | "not_found"
    | "no_profile";
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function parseIntField(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number.parseInt(value.trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/** 現在ユーザーの占い師プロフィール id（所有権の起点）。FORTUNE_TELLER/ADMIN のみ。 */
async function resolveOwnerContext(): Promise<
  | { ok: true; userId: string; isAdmin: boolean; advisorProfileId: string | null }
  | { ok: false; error: ServiceMutationResult["error"] }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.role !== "FORTUNE_TELLER" && user.role !== "ADMIN") {
    return { ok: false, error: "not_advisor" };
  }
  const profile = await db.fortuneTellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return {
    ok: true,
    userId: user.id,
    isAdmin: user.role === "ADMIN",
    advisorProfileId: profile?.id ?? null,
  };
}

/**
 * サービス作成/更新（useActionState 用）. serviceId が hidden で渡れば更新、なければ作成。
 */
export async function saveAdvisorService(
  _prev: ServiceActionState,
  formData: FormData
): Promise<ServiceActionState> {
  const ctx = await resolveOwnerContext();
  if (!ctx.ok) {
    return {
      ok: false,
      error:
        ctx.error === "not_advisor"
          ? "この操作を行う権限がありません。"
          : "ログインが必要です。",
    };
  }
  if (!ctx.advisorProfileId) {
    return {
      ok: false,
      error: "占い師プロフィールが未作成です。先に占い師登録を完了してください。",
    };
  }
  const advisorProfileId = ctx.advisorProfileId;

  const serviceId = asString(formData.get("serviceId")).trim();
  const fieldErrors: ServiceActionState["fieldErrors"] = {};

  const title = asString(formData.get("title")).trim();
  if (title.length < TITLE_MIN) {
    fieldErrors.title = `タイトルは${TITLE_MIN}文字以上で入力してください。`;
  } else if (title.length > TITLE_MAX) {
    fieldErrors.title = `タイトルは${TITLE_MAX}文字以内で入力してください。`;
  }

  const descriptionRaw = asString(formData.get("description"));
  const descLen = descriptionRaw.trim().length;
  if (descLen < DESC_MIN) {
    fieldErrors.description = `説明は${DESC_MIN}文字以上で入力してください。`;
  } else if (descLen > DESC_MAX) {
    fieldErrors.description = `説明は${DESC_MAX}文字以内で入力してください。`;
  }

  const methodRaw = asString(formData.get("method")).trim().toUpperCase();
  const method = (VALID_METHODS as readonly string[]).includes(methodRaw)
    ? (methodRaw as ConsultationMethod)
    : null;
  if (!method) fieldErrors.method = "相談形式を選択してください。";

  const priceJpy = parseIntField(asString(formData.get("priceJpy")));
  if (priceJpy == null || priceJpy < PRICE_MIN || priceJpy > PRICE_MAX) {
    fieldErrors.priceJpy = `価格は${PRICE_MIN}〜${PRICE_MAX.toLocaleString("ja-JP")}円で入力してください。`;
  }

  const durationMin = parseIntField(asString(formData.get("durationMin")));
  if (durationMin == null || durationMin < DURATION_MIN || durationMin > DURATION_MAX) {
    fieldErrors.durationMin = `所要時間は${DURATION_MIN}〜${DURATION_MAX}分で入力してください。`;
  }

  const categoryId = asString(formData.get("categoryId")).trim();
  if (!categoryId) fieldErrors.categoryId = "占術カテゴリを選択してください。";

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "入力内容を確認してください。", fieldErrors };
  }

  // カテゴリ実在検証。
  const category = await db.divinationCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return {
      ok: false,
      error: "入力内容を確認してください。",
      fieldErrors: { categoryId: "占術カテゴリを選択してください。" },
    };
  }

  const description = sanitizeText(descriptionRaw, DESC_MAX);
  const isPublished = formData.get("isPublished") === "on";
  const titleSafe = sanitizeText(title, TITLE_MAX);

  if (serviceId) {
    // 更新: 所有権検証（自分のサービスのみ。ADMIN は全件可）。
    const existing = await db.service.findUnique({
      where: { id: serviceId },
      select: { id: true, advisorId: true },
    });
    if (!existing) return { ok: false, error: "対象のサービスが見つかりません。" };
    if (!ctx.isAdmin && existing.advisorId !== advisorProfileId) {
      return { ok: false, error: "この操作は許可されていません。" };
    }
    await db.service.update({
      where: { id: existing.id },
      data: {
        title: titleSafe,
        description,
        method: method as ConsultationMethod,
        priceJpy: priceJpy as number,
        durationMin: durationMin as number,
        categoryId,
        isPublished,
      },
    });
    revalidatePath("/advisor/services");
    revalidatePath("/advisor");
    return { ok: true, saved: true };
  }

  // 作成: 自分のプロフィールに紐付け（client から advisorId を受け取らない）。
  const created = await db.service.create({
    data: {
      advisorId: advisorProfileId,
      categoryId,
      title: titleSafe,
      description,
      method: method as ConsultationMethod,
      priceJpy: priceJpy as number,
      durationMin: durationMin as number,
      isPublished,
    },
    select: { id: true },
  });
  revalidatePath("/advisor/services");
  revalidatePath("/advisor");
  return { ok: true, saved: true, createdId: created.id };
}

/** 公開/非公開トグル（所有権検証）。検索/一覧の可視性に直結（spec §4.1）。 */
export async function toggleServicePublished(
  serviceId: string,
  nextPublished: boolean
): Promise<ServiceMutationResult> {
  const ctx = await resolveOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const existing = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true, advisorId: true },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (!ctx.isAdmin && existing.advisorId !== ctx.advisorProfileId) {
    return { ok: false, error: "forbidden" };
  }

  await db.service.update({
    where: { id: existing.id },
    data: { isPublished: nextPublished },
  });
  revalidatePath("/advisor/services");
  revalidatePath("/advisor");
  return { ok: true };
}

/** サービス削除（所有権検証）。 */
export async function deleteAdvisorService(
  serviceId: string
): Promise<ServiceMutationResult> {
  const ctx = await resolveOwnerContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const existing = await db.service.findUnique({
    where: { id: serviceId },
    select: { id: true, advisorId: true },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (!ctx.isAdmin && existing.advisorId !== ctx.advisorProfileId) {
    return { ok: false, error: "forbidden" };
  }

  await db.service.delete({ where: { id: existing.id } });
  revalidatePath("/advisor/services");
  revalidatePath("/advisor");
  return { ok: true };
}
