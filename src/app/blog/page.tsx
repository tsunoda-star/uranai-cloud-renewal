import type { Metadata } from "next";

import {
  getBlogCategoriesWithCounts,
  getBlogTagsWithCounts,
} from "@/lib/queries";
import { BlogListing } from "@/components/blog/blog-listing";
import { BlogTaxonomyChips } from "@/components/blog/blog-taxonomy-chips";
import { parsePostParams } from "@/lib/blog-search-params";
import type { RawSearchParams } from "@/lib/search-params";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "コラム・読みもの",
  description:
    "占いの基礎から恋愛・仕事・金運の開運ヒントまで。占い師と運営がお届けするコラムを、カテゴリ・タグ・キーワードで探せます。",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "コラム・読みもの | 占いクラウド",
    description:
      "占いの基礎から恋愛・仕事・金運の開運ヒントまで。占い師と運営がお届けするコラム。",
    url: absoluteUrl("/blog"),
  },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const [categories, tags] = await Promise.all([
    getBlogCategoriesWithCounts(),
    getBlogTagsWithCounts(),
  ]);
  const query = parsePostParams(raw);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-content">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
          Blog
        </p>
        <h1 className="mt-1 text-balance font-heading text-h1 font-bold text-primary">
          コラム・読みもの
        </h1>
        <p className="mt-2 text-balance text-body-lg text-gray-500">
          占いの基礎から、恋愛・仕事・金運の開運ヒントまで。気になるテーマから読んでみましょう。
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <BlogListing rawSearchParams={raw} query={query} basePath="/blog" />
        </div>

        <aside className="lg:order-last">
          <div className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base lg:sticky lg:top-24">
            <BlogTaxonomyChips categories={categories} tags={tags} />
          </div>
        </aside>
      </div>
    </div>
  );
}
