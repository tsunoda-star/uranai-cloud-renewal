import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import {
  getBlogCategoryBySlug,
  getBlogCategoriesWithCounts,
  getBlogTagsWithCounts,
} from "@/lib/queries";
import { BlogListing } from "@/components/blog/blog-listing";
import { BlogTaxonomyChips } from "@/components/blog/blog-taxonomy-chips";
import { parsePostParams } from "@/lib/blog-search-params";
import type { RawSearchParams } from "@/lib/search-params";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getBlogCategoryBySlug(slug);
  if (!category) return { title: "カテゴリが見つかりません" };

  const title = `${category.name}のコラム`;
  const description =
    category.description ?? `${category.name}に関する占いコラムの一覧です。`;
  const url = absoluteUrl(`/blog/category/${category.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | 占いクラウド`, description, url },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const category = await getBlogCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, tags] = await Promise.all([
    getBlogCategoriesWithCounts(),
    getBlogTagsWithCounts(),
  ]);
  const query = parsePostParams(raw, { categorySlug: category.slug });
  const basePath = `/blog/category/${category.slug}`;

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/blog"
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              コラム
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
          {category.name}のコラム
        </h1>
        {category.description && (
          <p className="mt-2 text-balance text-body-lg text-gray-500">
            {category.description}
          </p>
        )}
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <BlogListing rawSearchParams={raw} query={query} basePath={basePath} />
        </div>

        <aside className="lg:order-last">
          <div className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base lg:sticky lg:top-24">
            <BlogTaxonomyChips
              categories={categories}
              tags={tags}
              activeCategorySlug={category.slug}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
