"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { UserRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { ROLE_MENU, ROLE_LABEL } from "./nav-items";

export interface SessionUser {
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
}

/**
 * Role-aware account dropdown (logged-in state).
 *
 * Accessibility:
 * - trigger exposes `aria-haspopup="menu"` + `aria-expanded`
 * - the panel is `role="menu"`, items are `role="menuitem"`
 * - Escape closes and returns focus to the trigger; outside click closes
 */
export function UserMenu({
  user,
  logoutUrl,
}: {
  user: SessionUser;
  logoutUrl: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const items = ROLE_MENU[user.role];

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-base px-2 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar
          name={user.displayName}
          src={user.avatarUrl ?? undefined}
          size="sm"
        />
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {user.displayName}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="menu"
            aria-label="アカウントメニュー"
            initial={reduce ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 z-dropdown mt-2 w-56 overflow-hidden rounded-base border border-gray-200 bg-card py-1 shadow-md"
          >
            <p className="px-4 py-2 text-xs text-gray-500">
              {ROLE_LABEL[user.role]}としてログイン中
            </p>
            <div className="h-px bg-gray-200" role="none" />
            {items.map((item) => (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-primary transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-gray-200" role="none" />
            <Link
              role="menuitem"
              href={logoutUrl}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-state-danger transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              ログアウト
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
