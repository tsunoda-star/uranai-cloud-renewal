import type {
  ConsultationMethod,
  DivinationCategorySlug,
} from "@prisma/client";

import type {
  AdvisorSearchParams,
  AdvisorSort,
  ServiceSearchParams,
  ServiceSort,
} from "@/lib/queries";

/**
 * URL searchParams → typed query params (spec §2 / §4.1).
 *
 * The URL is the single source of truth for the catalog views, so parsing is
 * tolerant: unknown / malformed values fall back to "no filter" rather than
 * throwing, keeping shared / reloaded links robust. Category slugs arrive
 * lowercased in URLs (CategoryCard) and are upper-cased to the enum here.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const VALID_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

const VALID_CATEGORY_SLUGS: readonly DivinationCategorySlug[] = [
  "TAROT",
  "PALMISTRY",
  "FOUR_PILLARS",
  "NINE_STAR_KI",
  "NUMEROLOGY",
  "SPIRITUAL_SENSE",
  "FENG_SHUI",
  "PHYSIOGNOMY",
  "WESTERN_ASTROLOGY",
  "SPIRITUAL",
  "SANMEI",
  "EKI",
  "NAME_DIVINATION",
  "SIX_STAR",
  "OTHER",
];

/** Coerce a (possibly lowercased) slug to the enum, or undefined. */
export function parseCategorySlug(
  value: string | undefined
): DivinationCategorySlug | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (VALID_CATEGORY_SLUGS as readonly string[]).includes(upper)
    ? (upper as DivinationCategorySlug)
    : undefined;
}

function parseMethod(value: string | undefined): ConsultationMethod | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return (VALID_METHODS as readonly string[]).includes(upper)
    ? (upper as ConsultationMethod)
    : undefined;
}

/** Parse a "min-max" price band (either side may be empty). */
function parsePrice(value: string | undefined): {
  priceMin?: number;
  priceMax?: number;
} {
  if (!value) return {};
  const [minRaw, maxRaw] = value.split("-");
  const out: { priceMin?: number; priceMax?: number } = {};
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (minRaw && Number.isFinite(min) && min >= 0) out.priceMin = min;
  if (maxRaw && Number.isFinite(max) && max >= 0) out.priceMax = max;
  return out;
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function parseRating(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= 5 ? n : undefined;
}

const ADVISOR_SORTS: readonly AdvisorSort[] = ["recommended", "newest", "rating"];
const SERVICE_SORTS: readonly ServiceSort[] = [
  "recommended",
  "newest",
  "price_asc",
  "price_desc",
];

function parseAdvisorSort(value: string | undefined): AdvisorSort {
  return value && (ADVISOR_SORTS as readonly string[]).includes(value)
    ? (value as AdvisorSort)
    : "recommended";
}

function parseServiceSort(value: string | undefined): ServiceSort {
  return value && (SERVICE_SORTS as readonly string[]).includes(value)
    ? (value as ServiceSort)
    : "recommended";
}

/** Build typed advisor query params from raw URL searchParams. */
export function parseAdvisorParams(
  raw: RawSearchParams,
  overrides?: { category?: DivinationCategorySlug }
): AdvisorSearchParams {
  const price = parsePrice(first(raw.price));
  return {
    category: overrides?.category ?? parseCategorySlug(first(raw.category)),
    method: parseMethod(first(raw.method)),
    ...price,
    ratingMin: parseRating(first(raw.rating)),
    q: first(raw.q)?.trim() || undefined,
    sort: parseAdvisorSort(first(raw.sort)),
    page: parsePage(first(raw.page)),
    perPage: 12,
  };
}

/** Build typed service query params from raw URL searchParams. */
export function parseServiceParams(
  raw: RawSearchParams,
  overrides?: { category?: DivinationCategorySlug }
): ServiceSearchParams {
  const price = parsePrice(first(raw.price));
  return {
    category: overrides?.category ?? parseCategorySlug(first(raw.category)),
    method: parseMethod(first(raw.method)),
    ...price,
    sort: parseServiceSort(first(raw.sort)),
    page: parsePage(first(raw.page)),
    perPage: 12,
  };
}

/** Re-serialize the catalog facets to a query string, overriding `page`. */
export function buildAdvisorQuery(
  raw: RawSearchParams,
  page: number,
  opts?: { omitCategory?: boolean }
): string {
  const params = new URLSearchParams();
  const category = first(raw.category);
  if (!opts?.omitCategory && category) params.set("category", category);
  const method = first(raw.method);
  if (method) params.set("method", method);
  const price = first(raw.price);
  if (price) params.set("price", price);
  const rating = first(raw.rating);
  if (rating) params.set("rating", rating);
  const sort = first(raw.sort);
  if (sort && sort !== "recommended") params.set("sort", sort);
  const q = first(raw.q)?.trim();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

/** Re-serialize service facets to a query string, overriding `page`. */
export function buildServiceQuery(
  raw: RawSearchParams,
  page: number,
  opts?: { omitCategory?: boolean }
): string {
  const params = new URLSearchParams();
  const category = first(raw.category);
  if (!opts?.omitCategory && category) params.set("category", category);
  const method = first(raw.method);
  if (method) params.set("method", method);
  const price = first(raw.price);
  if (price) params.set("price", price);
  const sort = first(raw.sort);
  if (sort && sort !== "recommended") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}
