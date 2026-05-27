"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Desktop nav link with active-state styling.
 * Active = exact match or a sub-path (e.g. /blog/foo highlights /blog).
 * Active link uses brand-teal-strong text + underline (header-nav spec §スタイル).
 */
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base",
        isActive
          ? "text-brand-teal-strong after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand-teal-strong"
          : "text-gray-500 hover:text-primary"
      )}
    >
      {label}
    </Link>
  );
}
