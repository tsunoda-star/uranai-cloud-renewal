import Link from "next/link";
import { Star } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { METHOD_META } from "@/lib/divination";
import { formatInt, formatRating } from "@/lib/format";
import type { AdvisorCardView } from "@/lib/queries";

/**
 * FortuneTellerCard — advisor summary tile.
 * - up to 3 category Badges (+N overflow)
 * - consultation methods as icon + text (A11Y-10: not colour-only)
 * - rating as brand-gold star + numeric value (count in parens), only when present
 * Whole card links to /advisors/{slug}.
 */
export function FortuneTellerCard({ advisor }: { advisor: AdvisorCardView }) {
  const shownCategories = advisor.categories.slice(0, 3);
  const overflow = advisor.categories.length - shownCategories.length;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-gray-200 bg-card p-6 shadow-base transition-[transform,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start gap-4">
        <Avatar
          name={advisor.displayName}
          src={advisor.avatarUrl}
          alt={`${advisor.displayName}のプロフィール写真`}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-h3 font-semibold text-primary">
            <Link
              href={`/advisors/${advisor.slug}`}
              aria-label={`${advisor.displayName}のプロフィールを見る`}
              className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
            >
              {advisor.displayName}
            </Link>
          </h3>
          {/* 公開中の占い師は「受付中」。緑ドットは装飾、テキストで状態を伝える (A11Y-10)。 */}
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-state-success-fg">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-brand-green animate-pulse-dot"
              aria-hidden="true"
            />
            受付中
          </p>
          {advisor.rating && (
            <p className="mt-1 flex items-center gap-1 text-sm">
              <Star
                className="h-4 w-4 fill-brand-gold text-brand-gold"
                aria-hidden="true"
              />
              <span className="font-semibold tabular-nums text-primary">
                {formatRating(advisor.rating.average)}
              </span>
              <span className="text-gray-500">
                （{formatInt(advisor.rating.count)}件）
              </span>
            </p>
          )}
        </div>
      </div>

      {shownCategories.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {shownCategories.map((c) => (
            <li key={c.slug}>
              <Badge variant="accent">{c.label}</Badge>
            </li>
          ))}
          {overflow > 0 && (
            <li>
              <Badge variant="secondary">+{overflow}</Badge>
            </li>
          )}
        </ul>
      )}

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-500">
        {advisor.excerpt}
      </p>

      {advisor.methods.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-gray-200 pt-4">
          {advisor.methods.map((m) => {
            const meta = METHOD_META[m];
            const Icon = meta.icon;
            return (
              <li
                key={m}
                className="flex items-center gap-1 text-xs text-gray-500"
              >
                <Icon
                  className="h-3.5 w-3.5 text-brand-teal-strong"
                  aria-hidden="true"
                />
                {meta.label}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
