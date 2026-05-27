import type { ConsultationStatus } from "@prisma/client";
import type { BadgeProps } from "@/components/ui/badge";

/**
 * ConsultationStatus → 表示ラベル + Badge variant（spec §5.1）.
 * 単一の表示メタ定義（MNT-2）。色のみに依存せずテキストラベルを併記する（A11Y）。
 */
export const CONSULTATION_STATUS_META: Record<
  ConsultationStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  PENDING: { label: "受付中", variant: "warning" },
  ACCEPTED: { label: "承認済み", variant: "success" },
  RESCHEDULED: { label: "日程調整中", variant: "accent" },
  DECLINED: { label: "辞退", variant: "secondary" },
  CANCELLED: { label: "取消済み", variant: "secondary" },
};

/**
 * 占い師による応答アクション（spec §5.1）.
 * - accept     : 承認（→ ACCEPTED）
 * - reschedule : 日程調整提案（→ RESCHEDULED, proposedSlot + responseMessage）
 * - decline    : 辞退（→ DECLINED, responseMessage）
 */
export type AdvisorResponseAction = "accept" | "reschedule" | "decline";

const ACTION_TARGET: Record<AdvisorResponseAction, ConsultationStatus> = {
  accept: "ACCEPTED",
  reschedule: "RESCHEDULED",
  decline: "DECLINED",
};

/**
 * 許可される遷移（spec §5.1 状態遷移図）— 単一の真実（MNT-2）.
 *
 *   PENDING     → ACCEPTED / RESCHEDULED / DECLINED
 *   RESCHEDULED → ACCEPTED / DECLINED    （cancelled はユーザー操作 = 別 Action）
 *
 * 終端（ACCEPTED / DECLINED / CANCELLED）からは占い師応答での遷移不可。
 * ユーザー取消（→ CANCELLED）は consultation の cancelMyRequest が担う。
 */
const ALLOWED_FROM: Record<ConsultationStatus, ReadonlySet<ConsultationStatus>> = {
  PENDING: new Set(["ACCEPTED", "RESCHEDULED", "DECLINED"]),
  RESCHEDULED: new Set(["ACCEPTED", "DECLINED"]),
  ACCEPTED: new Set(),
  DECLINED: new Set(),
  CANCELLED: new Set(),
};

/** 現在状態 + 占い師アクション → 適用後の状態。許可されない遷移は null。 */
export function resolveAdvisorTransition(
  current: ConsultationStatus,
  action: AdvisorResponseAction
): ConsultationStatus | null {
  const next = ACTION_TARGET[action];
  return ALLOWED_FROM[current].has(next) ? next : null;
}
