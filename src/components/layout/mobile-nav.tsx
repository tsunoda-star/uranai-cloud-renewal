"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PRIMARY_NAV,
  ADVISOR_REGISTER,
  ROLE_MENU,
  ROLE_LABEL,
} from "./nav-items";
import type { SessionUser } from "./user-menu";

/**
 * Mobile navigation (hamburger -> slide-in sheet).
 *
 * Accessibility (header-nav spec):
 * - trigger has `aria-expanded` + `aria-controls`
 * - panel is `role="dialog" aria-modal`, closes on Escape / backdrop click
 * - focus moves into the panel on open and is trapped (Tab cycles), and returns
 *   to the trigger on close
 * - all targets are >= 44px
 */
export function MobileNav({
  user,
  loginUrl,
  logoutUrl,
}: {
  user: SessionUser | null;
  loginUrl: string;
  logoutUrl: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const panelId = "mobile-nav-panel";

  const close = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Lock scroll, focus the panel, trap Tab focus, close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const roleItems = user ? ROLE_MENU[user.role] : [];

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="メニューを開く"
        className="inline-flex h-11 w-11 items-center justify-center rounded-base text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={close}
              className="fixed inset-0 z-overlay bg-primary/40 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              key="panel"
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="メインメニュー"
              initial={reduce ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-y-0 right-0 z-modal flex w-[85%] max-w-sm flex-col overflow-y-auto bg-background p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="font-heading text-h4 font-bold text-primary">
                  メニュー
                </span>
                <button
                  type="button"
                  onClick={close}
                  aria-label="メニューを閉じる"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-base text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <nav aria-label="モバイルナビゲーション" className="mt-6">
                <ul className="flex flex-col gap-1">
                  {PRIMARY_NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        className="flex min-h-11 items-center rounded-base px-3 text-body-lg font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-4">
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-brand-teal text-brand-teal-strong hover:bg-brand-rose-pale"
                >
                  <Link href={ADVISOR_REGISTER.href} onClick={close}>
                    {ADVISOR_REGISTER.label}
                  </Link>
                </Button>
              </div>

              <div className="my-6 h-px bg-gray-200" role="none" />

              {user ? (
                <div className="flex flex-col gap-1">
                  <p className="px-3 text-xs text-gray-500">
                    {ROLE_LABEL[user.role]}・{user.displayName}
                  </p>
                  {roleItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={close}
                      className={cn(
                        "flex min-h-11 items-center rounded-base px-3 text-base text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link
                    href={logoutUrl}
                    onClick={close}
                    className="flex min-h-11 items-center gap-2 rounded-base px-3 text-base text-state-danger transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    ログアウト
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button asChild size="lg" className="w-full">
                    <Link href="/advisors" onClick={close}>
                      相談をはじめる
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="lg"
                    className="w-full"
                  >
                    <Link href={loginUrl} onClick={close}>
                      ログイン
                    </Link>
                  </Button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
