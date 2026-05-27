import type { PostStatus } from "@prisma/client";

/**
 * BlogPost 状態遷移ルール（spec §5.2, AC-C2-5/6/7, AC-C3-2/3）.
 *
 *   [DRAFT] ──► [SCHEDULED]（公開日時=未来）──(publishedAt 到達, compute-on-read)──► [PUBLISHED]
 *      │                                                                                  │
 *      └──────────────────────────► [PUBLISHED]（即時公開）                               │
 *                                                                                         ▼
 *                              [ARCHIVED]（運営 archive / 占い師 取下げ）◄────────────────┘
 *
 * 公開後の slug は不変（SEO-16）。本モジュールは「どの遷移が許可されるか」のみを
 * 表現する純関数群（DB に触れない）。実際の publishedAt 設定や所有権検証は
 * server action 側で行う。compute-on-read（ADR-1）のため、SCHEDULED(未来) →
 * PUBLISHED は明示遷移ではなく publishedPostWhere() の述語で自動的に公開扱いになる。
 */

/** 各 status から「明示的に」遷移できる先（ユーザー/運営の操作で）。 */
const ALLOWED_TRANSITIONS: Record<PostStatus, readonly PostStatus[]> = {
  DRAFT: ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"],
  SCHEDULED: ["SCHEDULED", "PUBLISHED", "DRAFT", "ARCHIVED"],
  // 公開後は取下げ（ARCHIVED）のみ。DRAFT/SCHEDULED への差戻しは不可（公開済みのため）。
  PUBLISHED: ["PUBLISHED", "ARCHIVED"],
  // archive からは再公開（PUBLISHED）または下書きへ戻す（再編集）を許可。
  ARCHIVED: ["ARCHIVED", "PUBLISHED", "DRAFT"],
};

/** `from` から `to` への明示遷移が許可されているか。 */
export function canTransition(from: PostStatus, to: PostStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** 一度でも公開された（= slug 不変にすべき）状態か。PUBLISHED もしくは ARCHIVED。 */
export function isSlugLocked(status: PostStatus): boolean {
  // PUBLISHED は当然不変。ARCHIVED は「公開後に取り下げた」可能性があるため不変扱い。
  return status === "PUBLISHED" || status === "ARCHIVED";
}

/** 占い師/運営エディタで選べる保存アクション。 */
export type PostSaveAction = "draft" | "publish" | "schedule" | "archive";

/** 保存アクション → 目標 status。 */
export function statusForAction(action: PostSaveAction): PostStatus {
  switch (action) {
    case "draft":
      return "DRAFT";
    case "publish":
      return "PUBLISHED";
    case "schedule":
      return "SCHEDULED";
    case "archive":
      return "ARCHIVED";
  }
}

const STATUS_VALUES: readonly PostStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
];

/** 文字列を PostStatus に安全変換（不正なら null）。 */
export function coercePostStatus(value: unknown): PostStatus | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  return (STATUS_VALUES as readonly string[]).includes(upper)
    ? (upper as PostStatus)
    : null;
}

/** 表示用ラベル。 */
export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: "下書き",
  SCHEDULED: "予約投稿",
  PUBLISHED: "公開中",
  ARCHIVED: "非公開",
};

/**
 * 公開承認フロー（AC-C3-3, OPEN-8）の有効/無効。
 *
 * 設定 ON 時: 占い師の DRAFT を直接 PUBLISHED にはせず、運営承認待ち
 * （PENDING_REVIEW 相当）として扱う。MVP では追加 enum を増やさず、
 * 「占い師が公開しようとしても運営が承認するまで PUBLISHED にしない」という
 * 運用境界を env で切り替える（既定 OFF = 占い師の即時公開を許可）。
 *
 * 環境変数 `BLOG_APPROVAL_REQUIRED=true` で ON。未設定/その他は OFF。
 */
export function isApprovalRequired(): boolean {
  return process.env.BLOG_APPROVAL_REQUIRED === "true";
}
