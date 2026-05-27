import type { Metadata } from "next";

import { getCategories } from "@/lib/queries";
import { AdvisorListing } from "@/components/catalog/advisor-listing";
import {
  parseAdvisorParams,
  type RawSearchParams,
} from "@/lib/search-params";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "占い師を探す",
  description:
    "占術カテゴリ・相談形式・価格帯・評価で絞り込み、キーワードで占い師を検索。あなたに合う相談相手を見つけましょう。",
  alternates: { canonical: absoluteUrl("/advisors") },
  openGraph: {
    title: "占い師を探す | 占いクラウド",
    description:
      "占術カテゴリ・相談形式・価格帯・評価で絞り込み、キーワードで占い師を検索。",
    url: absoluteUrl("/advisors"),
  },
};

export default async function AdvisorsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const [categories, query] = await Promise.all([
    getCategories(),
    Promise.resolve(parseAdvisorParams(raw)),
  ]);

  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-content">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
          Advisors
        </p>
        <h1 className="mt-1 text-balance font-heading text-h1 font-bold text-primary">
          占い師を探す
        </h1>
        <p className="mt-2 text-balance text-body-lg text-gray-500">
          占術・相談形式・価格帯・評価で絞り込み、気になる占い師を見つけましょう。
        </p>
      </header>

      <div className="mt-8">
        <AdvisorListing
          rawSearchParams={raw}
          query={query}
          categories={categoryOptions}
          basePath="/advisors"
        />
      </div>
    </div>
  );
}
