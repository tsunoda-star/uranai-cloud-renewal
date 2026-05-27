import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCategories, getCategoryBySlug } from "@/lib/queries";
import { AdvisorListing } from "@/components/catalog/advisor-listing";
import {
  parseAdvisorParams,
  parseCategorySlug,
  type RawSearchParams,
} from "@/lib/search-params";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const enumSlug = parseCategorySlug(slug);
  if (!enumSlug) return { title: "カテゴリが見つかりません" };
  const category = await getCategoryBySlug(enumSlug);
  if (!category) return { title: "カテゴリが見つかりません" };

  const title = `${category.name}の占い師を探す`;
  const description =
    category.description ??
    `${category.name}を得意とする占い師を一覧から探せます。`;
  const url = absoluteUrl(`/advisors/categories/${slug.toLowerCase()}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | 占いクラウド`, description, url },
  };
}

export default async function AdvisorCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const enumSlug = parseCategorySlug(slug);
  if (!enumSlug) notFound();

  const [category, categories] = await Promise.all([
    getCategoryBySlug(enumSlug),
    getCategories(),
  ]);
  if (!category) notFound();

  const query = parseAdvisorParams(raw, { category: enumSlug });
  const basePath = `/advisors/categories/${slug.toLowerCase()}`;
  const categoryOptions = categories.map((c) => ({
    slug: c.slug,
    label: c.name,
  }));

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/advisors"
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              占い師を探す
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-primary" aria-current="page">
            {category.name}
          </li>
        </ol>
      </nav>

      <header className="mt-4 max-w-content">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
          Category
        </p>
        <h1 className="mt-1 text-balance font-heading text-h1 font-bold text-primary">
          {category.name}の占い師
        </h1>
        {category.description && (
          <p className="mt-2 text-balance text-body-lg text-gray-500">
            {category.description}
          </p>
        )}
      </header>

      <div className="mt-8">
        <AdvisorListing
          rawSearchParams={raw}
          query={query}
          categories={categoryOptions}
          basePath={basePath}
          lockCategory
        />
      </div>
    </div>
  );
}
