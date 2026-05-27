import type { UserRole } from "@prisma/client";

/** Primary global navigation (shared by desktop nav, mobile sheet, footer). */
export const PRIMARY_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/advisors", label: "占い師を探す" },
  { href: "/services", label: "鑑定を探す" },
  { href: "/blog", label: "ブログ" },
];

/** Advisor-recruitment link, visually distinguished (outline coral) from primary nav. */
export const ADVISOR_REGISTER = {
  href: "/register/advisor",
  label: "占い師として登録",
} as const;

/** Role-aware "my page" menu entries (header dropdown + mobile sheet). */
export const ROLE_MENU: Record<
  UserRole,
  ReadonlyArray<{ href: string; label: string }>
> = {
  GENERAL: [
    { href: "/mypage", label: "マイページ" },
    { href: "/mypage#favorites-heading", label: "お気に入り" },
    { href: "/mypage#requests-heading", label: "予約リクエスト" },
  ],
  FORTUNE_TELLER: [
    { href: "/advisor", label: "ダッシュボード" },
    { href: "/advisor/requests", label: "予約リクエスト管理" },
    { href: "/advisor/services", label: "サービス管理" },
    { href: "/advisor/posts", label: "記事管理" },
    { href: "/advisor/profile", label: "プロフィール管理" },
  ],
  ADMIN: [
    { href: "/admin", label: "管理" },
    { href: "/admin/blog", label: "ブログ管理" },
    { href: "/advisor", label: "占い師ダッシュボード" },
  ],
};

/** Short human-readable role label for the account menu header. */
export const ROLE_LABEL: Record<UserRole, string> = {
  GENERAL: "一般ユーザー",
  FORTUNE_TELLER: "占い師",
  ADMIN: "運営",
};
