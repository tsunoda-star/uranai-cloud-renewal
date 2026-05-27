import { SearchX } from "lucide-react";

import { searchPosts, type PostSearchParams } from "@/lib/queries";
import { BlogCard } from "@/components/home/blog-card";
import { FadeIn } from "@/components/home/fade-in";
import { Pagination } from "@/components/catalog/pagination";
import { BlogSearch } from "@/components/blog/blog-search";
import { formatInt } from "@/lib/format";
import {
  buildPostQuery,
} from "@/lib/blog-search-params";
import type { RawSearchParams } from "@/lib/search-params";

/**
 * Shared blog listing surface (used by /blog, /blog/category/[slug] and
 * /blog/tag/[slug]). Server Component: runs searchPosts() with the parsed query
 * (compute-on-read published predicate, ADR-1) and renders the keyword search
 * (Client), result count, BlogCard grid, pagination or the empty state. The URL
 * is the single source of truth (spec §2). Only public posts are ever read (§12).
 */
export async function BlogListing({
  rawSearchParams,
  query,
  basePath,
}: {
  rawSearchParams: RawSearchParams;
  query: PostSearchParams;
  /** Route the search form pushes to (keeps the category/tag landing context). */
  basePath: string;
}) {
  const result = await searchPosts(query);
  const initialQuery = (query.q ?? "").trim();

  const hrefForPage = (page: number) => {
    const qs = buildPostQuery(rawSearchParams, page);
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      <BlogSearch initialQuery={initialQuery} basePath={basePath} />

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <p className="text-sm text-gray-500" aria-live="polite">
          <span className="font-semibold tabular-nums text-primary">
            {formatInt(result.total)}
          </span>
          件の記事
          {result.totalPages > 1 && (
            <span className="ml-1 text-gray-500">
              （{result.page} / {result.totalPages} ページ）
            </span>
          )}
        </p>
      </div>

      {result.posts.length === 0 ? (
        <EmptyState hasQuery={initialQuery !== ""} />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.posts.map((post, i) => (
            <FadeIn as="li" index={Math.min(i, 6)} key={post.slug}>
              <BlogCard post={post} />
            </FadeIn>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        hrefForPage={hrefForPage}
      />
    </>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-card px-6 py-16 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-rose-pale"
        aria-hidden="true"
      >
        <SearchX className="h-7 w-7 text-brand-teal-strong" />
      </span>
      <h2 className="mt-5 font-heading text-h3 font-semibold text-primary">
        {hasQuery
          ? "条件に合う記事が見つかりませんでした"
          : "まだ公開記事がありません"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {hasQuery
          ? "検索キーワードを変えて、もう一度お試しください。"
          : "新しいコラムの公開をお待ちください。"}
      </p>
    </div>
  );
}
