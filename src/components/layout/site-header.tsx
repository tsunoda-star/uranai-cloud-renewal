import Link from "next/link";

import { getAuthProvider, getCurrentSession, getCurrentUser } from "@/lib/auth";
import { LogoMark } from "@/components/brand/logo-mark";
import { getUnreadNotificationCount } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { PRIMARY_NAV, ROLE_EXTRA_NAV, ADVISOR_REGISTER } from "./nav-items";
import { NavLink } from "./nav-link";
import { UserMenu, type SessionUser } from "./user-menu";
import { NotificationBell } from "./notification-bell";
import { MobileNav } from "./mobile-nav";

/**
 * Global site header (sticky). Server Component: it resolves the auth session
 * (DevAuthProvider in development, role read from the `dev_role` cookie) and
 * hands a plain `SessionUser` to the client menus.
 *
 * Roles are surfaced differently:
 * - logged out  -> ログイン + 相談をはじめる
 * - logged in   -> role-aware account dropdown (UserMenu)
 * The "占い師として登録" recruitment link is visually distinguished (outline coral).
 */
export async function SiteHeader() {
  const auth = getAuthProvider();
  const session = await getCurrentSession();
  const user: SessionUser | null = session
    ? { displayName: session.displayName, role: session.role }
    : null;
  const loginUrl = auth.getLoginUrl("/");
  const logoutUrl = auth.getLogoutUrl("/");
  // ロール別の追加ナビ (ADMIN→「管理」, FORTUNE_TELLER→「ダッシュボード」) を主要ナビへ
  // 常時可視化する。UserMenu ドロップダウンに頼らず 1 クリックで業務画面へ。
  const primaryNav = session
    ? [...PRIMARY_NAV, ...ROLE_EXTRA_NAV[session.role]]
    : PRIMARY_NAV;

  // 通知ベルは一般ユーザーのマイページ通知へ直結（AC-B7-6）。未読件数のみ取得。
  let unreadCount = 0;
  if (session?.role === "GENERAL") {
    const dbUser = await getCurrentUser();
    if (dbUser) unreadCount = await getUnreadNotificationCount(dbUser.id);
  }

  return (
    <header className="sticky top-0 z-sticky w-full border-b border-gray-200 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-container items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="animate-pop-in flex items-center gap-2 rounded-base font-heading text-h4 font-bold text-primary transition-colors hover:text-brand-teal-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {/* 本家ロゴタイプの左バッジを踏襲: ink #212529 角丸に「占＋雲」白マーク。 */}
          <span
            className="flex h-8 w-8 items-center justify-center rounded-base bg-brand-ink text-white"
            aria-hidden="true"
          >
            <LogoMark size={22} />
          </span>
          占いクラウド
        </Link>

        <nav
          aria-label="メインナビゲーション"
          className="hidden md:block"
        >
          <ul className="flex items-center gap-7">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-brand-teal text-brand-teal-strong hover:bg-brand-rose-pale"
          >
            <Link href={ADVISOR_REGISTER.href}>{ADVISOR_REGISTER.label}</Link>
          </Button>

          {user ? (
            <>
              {user.role === "GENERAL" && (
                <NotificationBell unreadCount={unreadCount} />
              )}
              <UserMenu user={user} logoutUrl={logoutUrl} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={loginUrl}>ログイン</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/advisors">相談をはじめる</Link>
              </Button>
            </>
          )}
        </div>

        <MobileNav user={user} loginUrl={loginUrl} logoutUrl={logoutUrl} />
      </div>
    </header>
  );
}
