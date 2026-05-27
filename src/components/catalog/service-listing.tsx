import { SearchX } from "lucide-react";

import { searchServices, type ServiceSearchParams } from "@/lib/queries";
import { ServiceCard } from "@/components/home/service-card";
import { FadeIn } from "@/components/home/fade-in";
import { Pagination } from "@/components/catalog/pagination";
import {
  ServiceFilters,
  type ServiceFilterState,
} from "@/components/catalog/service-filters";
import type { CategoryOption } from "@/components/catalog/advisor-filters";
import { formatInt } from "@/lib/format";
import { buildServiceQuery, type RawSearchParams } from "@/lib/search-params";

/**
 * Shared service listing surface (used by /services). Server Component: runs
 * searchServices() with the parsed query and renders the filter bar (Client),
 * result count, card grid, pagination or the empty state. The URL is the single
 * source of truth (spec §2). 要配慮情報 (相談概要) is never read here (§12).
 */
export async function ServiceListing({
  rawSearchParams,
  query,
  categories,
  basePath,
}: {
  rawSearchParams: RawSearchParams;
  query: ServiceSearchParams;
  categories: CategoryOption[];
  basePath: string;
}) {
  const result = await searchServices(query);

  const initial: ServiceFilterState = {
    category: (rawSearchParams.category as string) ?? "",
    method: (rawSearchParams.method as string) ?? "",
    price: (rawSearchParams.price as string) ?? "",
    sort: (rawSearchParams.sort as string) ?? "recommended",
  };

  const hrefForPage = (page: number) => {
    const qs = buildServiceQuery(rawSearchParams, page);
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <>
      <ServiceFilters
        categories={categories}
        initial={initial}
        basePath={basePath}
      />

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <p className="text-sm text-gray-500" aria-live="polite">
          <span className="font-semibold tabular-nums text-primary">
            {formatInt(result.total)}
          </span>
          件の鑑定メニュー
          {result.totalPages > 1 && (
            <span className="ml-1 text-gray-500">
              （{result.page} / {result.totalPages} ページ）
            </span>
          )}
        </p>
      </div>

      {result.services.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {result.services.map((service, i) => (
            <FadeIn as="li" index={Math.min(i, 6)} key={service.id}>
              <ServiceCard service={service} />
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
        条件に合う鑑定メニューが見つかりませんでした
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        絞り込み条件を変えて、もう一度お試しください。
      </p>
    </div>
  );
}
