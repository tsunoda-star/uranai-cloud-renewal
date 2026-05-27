import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Server-rendered pagination (links, not JS). Each page link preserves the
 * current filter query (passed pre-built by the page) so the URL stays the
 * single source of truth (spec §2 searchParams). Windowed page numbers keep
 * the control compact on mobile.
 */
export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  /** Build an href for a target page (keeps filters). */
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowSize = 2;
  const pages: number[] = [];
  for (
    let p = Math.max(1, page - windowSize);
    p <= Math.min(totalPages, page + windowSize);
    p++
  ) {
    pages.push(p);
  }

  return (
    <nav aria-label="ページ送り" className="mt-10 flex justify-center">
      <ul className="flex items-center gap-1">
        <li>
          <PageLink
            href={hrefForPage(page - 1)}
            disabled={page <= 1}
            ariaLabel="前のページ"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </PageLink>
        </li>

        {pages[0] > 1 && (
          <>
            <li>
              <PageLink href={hrefForPage(1)} ariaLabel="1ページ目">
                1
              </PageLink>
            </li>
            {pages[0] > 2 && (
              <li aria-hidden="true" className="px-1 text-gray-400">
                …
              </li>
            )}
          </>
        )}

        {pages.map((p) => (
          <li key={p}>
            <PageLink
              href={hrefForPage(p)}
              current={p === page}
              ariaLabel={`${p}ページ目`}
            >
              {p}
            </PageLink>
          </li>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && (
              <li aria-hidden="true" className="px-1 text-gray-400">
                …
              </li>
            )}
            <li>
              <PageLink
                href={hrefForPage(totalPages)}
                ariaLabel={`${totalPages}ページ目`}
              >
                {totalPages}
              </PageLink>
            </li>
          </>
        )}

        <li>
          <PageLink
            href={hrefForPage(page + 1)}
            disabled={page >= totalPages}
            ariaLabel="次のページ"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const base =
    "inline-flex h-11 min-w-11 items-center justify-center rounded-base border px-3 text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, "border-gray-200 text-gray-400")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={current ? "page" : undefined}
      className={cn(
        base,
        current
          ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
          : "border-gray-200 text-primary hover:bg-secondary"
      )}
    >
      {children}
    </Link>
  );
}
