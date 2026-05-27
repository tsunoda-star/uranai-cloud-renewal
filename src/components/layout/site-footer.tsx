import Link from "next/link";

import { siteConfig } from "@/lib/site";
import { db } from "@/lib/db";
import { LogoMark } from "@/components/brand/logo-mark";
import { PRIMARY_NAV, ADVISOR_REGISTER } from "./nav-items";

/**
 * Site footer (brand-ink #212529 dark surface, white 15.43:1 / gray-300 10.47:1).
 *
 * Columns (footer spec): tagline, サービス導線, 法務/サポート, 人気の占術.
 * Hover links use brand-teal-light (#5fd6d6, text-safe on ink ≥7.8:1). The legal
 * links (privacy / 特商法 / 利用規約) are permanent per spec §12 (AC-A2-4).
 * The brand badge shows the 本家「占＋雲」合字マーク (white, on a teal-tinted disc).
 *
 * The 占術 column is a live DB read (top sortOrder categories) — internal SEO
 * links, no hardcoded list.
 */

const LEGAL_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/legal/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/faq", label: "よくある質問" },
  { href: "/contact", label: "お問い合わせ" },
];

const SERVICE_LINKS = [...PRIMARY_NAV, ADVISOR_REGISTER];

const linkClass =
  "inline-flex min-h-9 items-center text-sm text-gray-300 transition-colors hover:text-brand-teal-light focus-visible:rounded-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

export async function SiteFooter() {
  const categories = await db.divinationCategory.findMany({
    orderBy: { sortOrder: "asc" },
    take: 8,
    select: { slug: true, name: true },
  });

  return (
    <footer className="border-t border-gray-700 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="max-w-content">
            <p className="flex items-center gap-2 font-heading text-h4 font-bold">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-base bg-white/10 text-white"
                aria-hidden="true"
              >
                <LogoMark size={22} />
              </span>
              占いクラウド
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {siteConfig.description}
            </p>
          </div>

          <nav aria-label="サービスナビゲーション">
            <h2 className="font-heading text-sm font-semibold text-white">
              サービス
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {SERVICE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="サポート・法務ナビゲーション">
            <h2 className="font-heading text-sm font-semibold text-white">
              サポート
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="占術カテゴリナビゲーション">
            <h2 className="font-heading text-sm font-semibold text-white">
              人気の占術
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/advisors/categories/${c.slug.toLowerCase()}`}
                    className={linkClass}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 border-t border-gray-700 pt-6">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} 占いクラウド. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
