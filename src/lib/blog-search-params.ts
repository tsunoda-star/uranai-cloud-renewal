import type { PostSearchParams } from "@/lib/queries";
import type { RawSearchParams } from "@/lib/search-params";

/**
 * URL searchParams → typed blog query params (spec §2 — URL is the single
 * source of truth). Parsing is tolerant: unknown / malformed values fall back to
 * "no filter" so shared / reloaded links stay robust.
 *
 * Only `q` (keyword) and `page` live in the blog list query string; category /
 * tag are expressed as path segments (/blog/category/[slug], /blog/tag/[slug])
 * and supplied via `overrides`.
 */

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Build typed blog query params from raw URL searchParams. */
export function parsePostParams(
  raw: RawSearchParams,
  overrides?: { categorySlug?: string; tagSlug?: string }
): PostSearchParams {
  return {
    q: first(raw.q)?.trim() || undefined,
    categorySlug: overrides?.categorySlug,
    tagSlug: overrides?.tagSlug,
    page: parsePage(first(raw.page)),
    perPage: 9,
  };
}

/** Re-serialize the blog list facets to a query string, overriding `page`. */
export function buildPostQuery(raw: RawSearchParams, page: number): string {
  const params = new URLSearchParams();
  const q = first(raw.q)?.trim();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}
