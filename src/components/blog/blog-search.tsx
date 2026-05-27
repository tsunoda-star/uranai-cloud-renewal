"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Blog keyword search bar (Client, AC-C1-6). The keyword lives in the URL
 * searchParams (spec §2: SSR searchParams) so links are shareable and reloads
 * reproduce the view. Submitting pushes `?q=...` to `basePath` (resetting page),
 * which re-runs the Server Component query (searchPosts → pg_trgm ILIKE, ADR-2).
 */
export function BlogSearch({
  initialQuery,
  basePath,
}: {
  initialQuery: string;
  /** Route to push to (e.g. "/blog", "/blog/category/love"). */
  basePath: string;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = React.useState(initialQuery);

  React.useEffect(() => {
    setKeyword(initialQuery);
  }, [initialQuery]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = keyword.trim();
    router.push(q ? `${basePath}?q=${encodeURIComponent(q)}` : basePath);
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <label htmlFor="blog-q" className="sr-only">
          記事タイトル・本文で検索
        </label>
        <Input
          id="blog-q"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="記事のキーワードで検索"
          className="h-12 border-gray-200 pl-10"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="lg" className="font-semibold">
          <Search className="h-4 w-4" aria-hidden="true" />
          検索
        </Button>
        {initialQuery.trim() !== "" && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => router.push(basePath)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            クリア
          </Button>
        )}
      </div>
    </form>
  );
}
