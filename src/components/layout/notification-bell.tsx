import Link from "next/link";
import { Bell } from "lucide-react";

/**
 * ヘッダー通知ベル（AC-B7-6 in-app 通知の入口）.
 *
 * Server Component: ログイン済みユーザーの未読件数を受け取り、未読バッジ付きで
 * /mypage（通知セクション）へリンクする。未読 0 ならバッジ非表示。GENERAL の
 * マイページ通知に直結（占い師/運営は各ダッシュボードで別途扱う）。
 */
export function NotificationBell({
  unreadCount,
  href = "/mypage#notifications-heading",
}: {
  unreadCount: number;
  href?: string;
}) {
  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? `通知（未読 ${unreadCount} 件）`
    : "通知";

  return (
    <Link
      href={href}
      aria-label={label}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-base text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {hasUnread && (
        <span
          className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-teal-strong px-1 text-[10px] font-semibold leading-4 text-white"
          aria-hidden="true"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
