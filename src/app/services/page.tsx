import type { Metadata } from "next";

import { getCategories } from "@/lib/queries";
import { ServiceListing } from "@/components/catalog/service-listing";
import { parseServiceParams, type RawSearchParams } from "@/lib/search-params";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "鑑定を探す",
  description:
    "占術カテゴリ・相談形式・価格帯で絞り込み、価格や新着順で並び替えて鑑定メニューを探せます。決済・実鑑定は次フェーズ。",
  alternates: { canonical: absoluteUrl("/services") },
  openGraph: {
    title: "鑑定を探す | 占いクラウド",
    description:
      "占術カテゴリ・相談形式・価格帯で絞り込み、価格や新着順で並び替えて鑑定メニューを探せます。",
    url: absoluteUrl("/services"),
  },
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const [categories, query] = await Promise.all([
    getCategories(),
    Promise.resolve(parseServiceParams(raw)),
  ]);

  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-content">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
          Services
        </p>
        <h1 className="mt-1 text-balance font-heading text-h1 font-bold text-primary">
          鑑定を探す
        </h1>
        <p className="mt-2 text-balance text-body-lg text-gray-500">
          占術・相談形式・価格帯で絞り込み、ぴったりの鑑定メニューを見つけましょう。
        </p>
      </header>

      <div className="mt-8">
        <ServiceListing
          rawSearchParams={raw}
          query={query}
          categories={categoryOptions}
          basePath="/services"
        />
      </div>
    </div>
  );
}
