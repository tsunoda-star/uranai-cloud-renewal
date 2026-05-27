import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { categoryIcon } from "@/lib/divination";
import type { CategoryView } from "@/lib/queries";
import { CelestialMotif } from "@/components/brand/celestial-motif";
import { HeroSearch, type CategoryOption } from "./hero-search";
import { FadeIn } from "./fade-in";

/**
 * Home hero (first view). Headline (display, Outfit 800 + Noto Sans JP) + subcopy +
 * search form + two CTAs + popular-category chips, on a white -> rose-pale band
 * (uranai 実配色のローズ帯。紫グラデ/グロー濫用は禁止のまま)。
 *
 * `popularCategories` are the first chips shown as shortcuts; the full list feeds
 * the search Select. h1 is the single page heading (hero spec).
 */
export function Hero({
  categories,
  popularCategories,
}: {
  categories: CategoryOption[];
  popularCategories: CategoryView[];
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white to-brand-rose-pale">
      <div className="mx-auto grid max-w-container items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-24">
        <div>
          <FadeIn index={0}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-teal-strong shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              全国の占い師・鑑定メニューが集まる場所
            </span>
          </FadeIn>

          <FadeIn index={1}>
            <h1 className="mt-5 text-balance font-heading text-display font-extrabold leading-tight tracking-display text-primary">
              あなたに合う
              <br className="hidden sm:block" />
              <span className="text-brand-teal-strong">占い師</span>
              を見つけよう
            </h1>
          </FadeIn>

          <FadeIn index={2}>
            <p className="mt-5 max-w-content text-balance text-body-lg text-gray-500">
              タロット・占星術・四柱推命など多彩な占術から、相談形式や評価で比較。
              温かく信頼できる相談相手に、今すぐ出会えます。
            </p>
          </FadeIn>

          <FadeIn index={3}>
            <div className="mt-7">
              <HeroSearch categories={categories} />
            </div>
          </FadeIn>

          <FadeIn index={4}>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg" className="font-semibold">
                <Link href="/advisors">占い師を探す</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/match">無料で相談する</Link>
              </Button>
            </div>
          </FadeIn>

          {popularCategories.length > 0 && (
            <FadeIn index={5}>
              <div className="mt-6">
                <p className="text-sm text-gray-500">人気の占術</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {popularCategories.map((c) => {
                    const Icon = categoryIcon(c.iconKey);
                    return (
                      <li key={c.slug}>
                        <Link
                          href={`/advisors/categories/${c.slug.toLowerCase()}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-brand-teal hover:text-brand-teal-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Icon
                            className="h-4 w-4 text-brand-teal-strong"
                            aria-hidden="true"
                          />
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </FadeIn>
          )}
        </div>

        {/* Brand visual: 本家 uranai.cloud の世界観 — ローズグラデ帯に黄道十二宮の
            星座モチーフ＋中央の「占＋雲」マーク（teal グロー）。装飾のみ（aria-hidden）。
            モーションは compositor-only（transform/opacity）で reduced-motion で全停止。 */}
        <FadeIn index={2} className="hidden lg:block">
          <CelestialMotif />
        </FadeIn>
      </div>
    </section>
  );
}
