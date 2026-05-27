import { SearchX } from "lucide-react";

import { searchAdvisors, type AdvisorSearchParams } from "@/lib/queries";
import { FortuneTellerCard } from "@/components/home/fortune-teller-card";
import { FadeIn } from "@/components/home/fade-in";
import { Pagination } from "@/components/catalog/pagination";
import {
  AdvisorFilters,
  type AdvisorFilterState,
  type CategoryOption,
} from "@/components/catalog/advisor-filters";
import { formatInt } from "@/lib/format";
import {
  buildAdvisorQuery,
  type RawSearchParams,
} from "@/lib/search-params";

/**
 * Shared advisor listing surface (used by /advisors and the per-category
 * landing). Server Component: runs searchAdvisors() with the parsed query and
 * renders the filter bar (Client), result count, card grid, pagination or the
 * empty state. The URL is the single source of truth.
 */
export async function AdvisorListing({
  rawSearchParams,
  query,
  categories,
  basePath,
  lockCategory = false,
}: {
  rawSearchParams: RawSearchParams;
  query: AdvisorSearchParams;
  categories: CategoryOption[];
  basePath: string;
  lockCategory?: boolean;
}) {
  const result = await searchAdvisors(query);

  const initial: AdvisorFilterState = {
    category: (rawSearchParams.category as string) ?? "",
    method: (rawSearchParams.method as string) ?? "",
    price: (rawSearchParams.price as string) ?? "",
    rating: (rawSearchParams.rating as string) ?? "",
    sort: (rawSearchParams.sort as string) ?? "recommended",
    q: ((rawSearchParams.q as string) ?? "").trim(),
  };

  const hrefForPage = (page: number) => {
    const qs = buildAdvisorQuery(rawSearchParams, page, {
      omitCategory: lockCategory,
    });
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      <AdvisorFilters
        categories={categories}
        initial={initial}
        basePath={basePath}
        lockCategory={lockCategory}
      />

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <p className="text-sm text-gray-500" aria-live="polite">
          <span className="font-semibold tabular-nums text-primary">
            {formatInt(result.total)}
          </span>
          名の占い師
          {result.totalPages > 1 && (
            <span className="ml-1 text-gray-500">
              （{result.page} / {result.totalPages} ページ）
            </span>
          )}
        </p>
      </div>

      {result.advisors.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.advisors.map((advisor, i) => (
            <FadeIn as="li" index={Math.min(i, 6)} key={advisor.slug}>
              <FortuneTellerCard advisor={advisor} />
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

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-card px-6 py-16 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-rose-pale"
        aria-hidden="true"
      >
        <SearchX className="h-7 w-7 text-brand-teal-strong" />
      </span>
      <h2 className="mt-5 font-heading text-h3 font-semibold text-primary">
        条件に合う占い師が見つかりませんでした
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        検索キーワードや絞り込み条件を変えて、もう一度お試しください。
      </p>
    </div>
  );
}
