import { UserPlus, Star, BookOpen, Radio } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { ActivityItem } from "@/lib/queries";

/**
 * LiveTicker — a "LIVE" activity marquee shown directly under the header
 * (brighty signature motion, v1.2.0).
 *
 * Data is fetched server-side (getRecentActivity) and is privacy-safe by
 * construction (§12): advisor 表示名 / ★評価 / 記事タイトル のみ。相談内容・
 * 個人特定情報は含まれない。
 *
 * Motion: the activity list is rendered TWICE inside a flex track and the track
 * is translated by -50% on a 100s linear loop (`animate-ticker`), giving a
 * seamless infinite scroll. Hovering / focusing the region pauses it
 * (`.ticker-track:hover`). `prefers-reduced-motion: reduce` disables the
 * animation in globals.css, leaving a static, readable list.
 *
 * This is a Server Component (no client JS needed — the marquee is pure CSS).
 */
const KIND_ICON: Record<ActivityItem["kind"], LucideIcon> = {
  advisor: UserPlus,
  review: Star,
  post: BookOpen,
};

function TickerEntry({ item }: { item: ActivityItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 px-5 text-sm text-gray-600">
      <Icon
        className="h-3.5 w-3.5 shrink-0 text-brand-teal-strong"
        aria-hidden="true"
      />
      <span className="whitespace-nowrap">{item.label}</span>
      {item.kind === "review" && item.rating != null && (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap font-medium tabular-nums text-primary">
          <Star
            className="h-3.5 w-3.5 fill-brand-gold text-brand-gold"
            aria-hidden="true"
          />
          {item.rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}

export function LiveTicker({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <aside
      aria-label="最近の動き"
      className="ticker-track relative w-full overflow-hidden border-b border-gray-200 bg-white"
    >
      <div className="mx-auto flex max-w-container items-center">
        {/* LIVE indicator (green pulse dot). Decorative dot + text label (A11Y-10). */}
        <span className="z-10 flex shrink-0 items-center gap-1.5 border-r border-gray-200 bg-white py-2 pl-4 pr-4 text-xs font-semibold uppercase tracking-wide text-state-success-fg sm:pl-6">
          <span
            className="inline-flex h-2 w-2 items-center justify-center"
            aria-hidden="true"
          >
            <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse-dot" />
          </span>
          <Radio className="h-3.5 w-3.5" aria-hidden="true" />
          LIVE
        </span>

        {/* Marquee viewport. The track holds the list twice for a seamless loop. */}
        <div className="relative min-w-0 flex-1 overflow-hidden py-2">
          <div className="animate-ticker flex w-max items-center">
            <ul className="flex items-center" aria-hidden="false">
              {items.map((item, i) => (
                <li key={`a-${i}`} className="flex items-center">
                  <TickerEntry item={item} />
                  <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
                </li>
              ))}
            </ul>
            {/* Duplicate copy (decorative) for the -50% seamless wrap. */}
            <ul className="flex items-center" aria-hidden="true">
              {items.map((item, i) => (
                <li key={`b-${i}`} className="flex items-center">
                  <TickerEntry item={item} />
                  <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </aside>
  );
}
