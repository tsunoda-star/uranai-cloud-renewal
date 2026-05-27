"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import {
  resolveAdvisorTransition,
  type AdvisorResponseAction,
} from "@/lib/consultation-status";

export interface CancelRequestResult {
  ok: boolean;
  error?: "unauthenticated" | "not_found" | "forbidden" | "invalid_state";
}

/**
 * ユーザーによる予約リクエスト取消（spec §5.1, AC-B8）.
 *
 * 所有権検証 (SEC-3): requesterId === 現在ユーザー の自分のリクエストのみ取消可。
 * 状態遷移: PENDING / RESCHEDULED のみ CANCELLED へ遷移可（accepted/declined/
 * cancelled は不可）。遷移はトランザクション整合で行い、宛先占い師へ通知する
 * （AC-B7-6, §5.1 各遷移で通知）。要配慮情報はログにも通知本文にも出さない（§12）。
 */
export async function cancelMyRequest(
  requestId: string
): Promise<CancelRequestResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const reqRow = await db.consultationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requesterId: true,
      status: true,
      advisor: { select: { userId: true } },
    },
  });
  if (!reqRow) return { ok: false, error: "not_found" };

  // 所有権検証: 自分のリクエストのみ（SEC-3）。
  if (reqRow.requesterId !== user.id) {
    return { ok: false, error: "forbidden" };
  }

  // 状態ガード: 取消可能な状態のみ。
  if (reqRow.status !== "PENDING" && reqRow.status !== "RESCHEDULED") {
    return { ok: false, error: "invalid_state" };
  }

  await db.$transaction(async (tx) => {
    await tx.consultationRequest.update({
      where: { id: reqRow.id },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    await tx.notification.create({
      data: {
        userId: reqRow.advisor.userId,
        type: "CONSULTATION_STATUS",
        title: "予約リクエストが取り消されました",
        body: `${user.displayName} さんが予約リクエストを取り消しました。`,
        linkUrl: "/advisor/requests",
      },
    });
  });

  revalidatePath("/mypage");
  revalidatePath("/advisor/requests");
  return { ok: true };
}

// ===========================================================================
// 占い師による応答（spec §5.1, AC-B7-3/4/5）
// ===========================================================================

const RESPONSE_MESSAGE_MAX = 1000;

export interface RespondRequestResult {
  ok: boolean;
  error?:
    | "unauthenticated"
    | "forbidden"
    | "not_found"
    | "invalid_transition"
    | "invalid_input"
    | "not_advisor";
}

/** 状態変化を requester に伝える通知文（要配慮情報は含めない, §12）。 */
const NOTIFICATION_BY_ACTION: Record<
  AdvisorResponseAction,
  { title: string; body: (advisorName: string) => string }
> = {
  accept: {
    title: "予約リクエストが承認されました",
    body: (n) => `${n} さんが予約リクエストを承認しました。詳細をご確認ください。`,
  },
  reschedule: {
    title: "占い師から日程調整の提案があります",
    body: (n) => `${n} さんから希望日時の調整提案が届きました。内容をご確認ください。`,
  },
  decline: {
    title: "予約リクエストが見送られました",
    body: (n) => `${n} さんが今回のご相談を見送りました。他の占い師もご検討ください。`,
  },
};

/**
 * 占い師による予約リクエスト応答（spec §5.1, AC-B7-3/4/5）.
 *
 * 不変条件:
 * - RBAC (SEC-2): 呼び出し元は FORTUNE_TELLER または ADMIN。それ以外は not_advisor。
 * - 所有権 (SEC-3): 対象リクエストの宛先占い師が「現在ユーザーの FortuneTellerProfile」
 *   であること（ADMIN は全件可）。クライアントから渡る id を信頼せず DB で再解決。
 * - 状態遷移 (§5.1): resolveAdvisorTransition で許可される遷移のみ。不正遷移は拒否。
 *   reschedule は proposedSlot（未来）必須、decline/reschedule は responseMessage を保存。
 * - トランザクション (REL-2): status/respondedAt 更新 + requester 宛 Notification 作成を
 *   1 トランザクションで実行。通知本文・ログに要配慮情報（summary）を出さない（§12）。
 */
export async function respondToRequest(input: {
  requestId: string;
  action: AdvisorResponseAction;
  responseMessage?: string;
  /** reschedule 時の提案日時（"YYYY-MM-DDTHH:mm" or ISO）。 */
  proposedSlot?: string;
}): Promise<RespondRequestResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.role !== "FORTUNE_TELLER" && user.role !== "ADMIN") {
    return { ok: false, error: "not_advisor" };
  }

  const { requestId, action } = input;
  if (action !== "accept" && action !== "reschedule" && action !== "decline") {
    return { ok: false, error: "invalid_input" };
  }

  const reqRow = await db.consultationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      requesterId: true,
      advisor: { select: { userId: true } },
    },
  });
  if (!reqRow) return { ok: false, error: "not_found" };

  // 所有権検証: 宛先占い師本人のみ（ADMIN は全件可）。SEC-3。
  if (user.role !== "ADMIN" && reqRow.advisor.userId !== user.id) {
    return { ok: false, error: "forbidden" };
  }

  // 状態遷移ガード（§5.1）。終端・不正遷移は拒否。
  const nextStatus = resolveAdvisorTransition(reqRow.status, action);
  if (!nextStatus) return { ok: false, error: "invalid_transition" };

  // 入力（responseMessage / proposedSlot）の検証 + サニタイズ。
  let responseMessage: string | null = null;
  const rawMessage = (input.responseMessage ?? "").trim();
  if (rawMessage.length > 0) {
    responseMessage = sanitizeText(rawMessage, RESPONSE_MESSAGE_MAX);
  }

  let proposedSlot: Date | null = null;
  if (action === "reschedule") {
    const rawSlot = (input.proposedSlot ?? "").trim();
    if (!rawSlot) return { ok: false, error: "invalid_input" };
    const d = new Date(rawSlot);
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return { ok: false, error: "invalid_input" };
    }
    proposedSlot = d;
    if (!responseMessage) {
      // 日程提案にはひとことコメントを必須にする（受け手が理解できるように）。
      return { ok: false, error: "invalid_input" };
    }
  }
  if (action === "decline" && !responseMessage) {
    return { ok: false, error: "invalid_input" };
  }

  // 占い師の表示名（通知本文用, 非PII）。
  const advisorName = user.displayName;
  const notif = NOTIFICATION_BY_ACTION[action];

  await db.$transaction(async (tx) => {
    await tx.consultationRequest.update({
      where: { id: reqRow.id },
      data: {
        status: nextStatus,
        respondedAt: new Date(),
        responseMessage,
        // accept では proposedSlot を変更しない（reschedule のみ設定）。
        ...(action === "reschedule" ? { proposedSlot } : {}),
      },
    });
    await tx.notification.create({
      data: {
        userId: reqRow.requesterId,
        type: "CONSULTATION_STATUS",
        title: notif.title,
        body: notif.body(advisorName),
        linkUrl: "/mypage#requests-heading",
      },
    });
  });

  // requester のマイページ + 占い師の受信一覧を再検証。
  revalidatePath("/mypage");
  revalidatePath("/advisor/requests");
  revalidatePath("/advisor");
  return { ok: true };
}
