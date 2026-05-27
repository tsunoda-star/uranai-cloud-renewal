import { Users, Sparkles, ClipboardList, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatInt, formatRating } from "@/lib/format";
import type { HomeStats } from "@/lib/queries";
import { FadeIn } from "./fade-in";
import { CountUp } from "./count-up";

/**
 * Trust band (brighty-style). Every metric is a live DB aggregate (HomeStats);
 * nothing is hardcoded (StatBand spec AC-A1-2). Rendered as a <dl> for semantics,
 * numbers use tabular-nums and count up from 0 when scrolled into view (CountUp;
 * reduced-motion -> instant final value). Average rating is omitted when there
 * is no data.
 */
export function StatBand({ stats }: { stats: HomeStats }) {
  const items: ReadonlyArray<{
    label: string;
    value: number;
    decimals?: 0 | 1;
    star?: boolean;
    unit?: string;
    icon: LucideIcon;
    srLabel?: string;
  }> = [
    {
      label: "公開中の占い師",
      value: stats.advisorCount,
      unit: "名",
      icon: Users,
    },
    {
      label: "占術カテゴリ",
      value: stats.categoryCount,
      unit: "種",
      icon: Sparkles,
    },
    {
      label: "鑑定メニュー",
      value: stats.serviceCount,
      unit: "件",
      icon: ClipboardList,
    },
    ...(stats.averageRating != null
      ? [
          {
            // The Star icon above the value already conveys the star; the
            // displayed number is the bare rating "4.5" (CountUp still supports
            // a ★ prefix via `star`, used elsewhere if needed).
            label: "平均満足度",
            value: stats.averageRating,
            decimals: 1 as const,
            star: false,
            unit: "／5",
            icon: Star,
            srLabel: `平均満足度 ${formatRating(stats.averageRating)} (${formatInt(stats.reviewCount)}件の口コミ)`,
          },
        ]
      : []),
  ];

  return (
    <section aria-label="サービスの実績" className="bg-brand-rose-pale">
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <FadeIn variant="scroll">
          <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center text-center"
                >
                  <span
                    className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5 text-brand-teal-strong" />
                  </span>
                  <dd
                    className="font-heading text-h1 font-bold tabular-nums text-primary"
                    aria-label={item.srLabel}
                  >
                    <CountUp
                      value={item.value}
                      decimals={item.decimals ?? 0}
                      star={item.star ?? false}
                    />
                    {item.unit && (
                      <span className="ml-0.5 text-h4 font-semibold text-gray-500">
                        {item.unit}
                      </span>
                    )}
                  </dd>
                  <dt className="mt-1 text-sm text-gray-500">{item.label}</dt>
                </div>
              );
            })}
          </dl>
        </FadeIn>
      </div>
    </section>
  );
}
