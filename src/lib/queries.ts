import type {
  ConsultationMethod,
  ConsultationStatus,
  DivinationCategorySlug,
  NotificationType,
  PostStatus,
  Prisma,
  UserRole,
} from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Read-side queries for the public marketing surfaces (Wave 2).
 *
 * Every value below is a live aggregate / row from PostgreSQL (seed dataset,
 * spec §11 unblock track). No counts or list contents are hardcoded — see
 * StatBand spec "ハードコード禁止".
 */

export interface HomeStats {
  advisorCount: number;
  categoryCount: number;
  serviceCount: number;
  reviewCount: number;
  averageRating: number | null;
}

/** Trust-band metrics. All four come from COUNT/AVG aggregates. */
export async function getHomeStats(): Promise<HomeStats> {
  const [advisorCount, categoryCount, serviceCount, ratingAgg] =
    await Promise.all([
      db.fortuneTellerProfile.count({ where: { isPublished: true } }),
      db.divinationCategory.count(),
      db.service.count({ where: { isPublished: true } }),
      db.review.aggregate({ _avg: { rating: true }, _count: true }),
    ]);

  return {
    advisorCount,
    categoryCount,
    serviceCount,
    reviewCount: ratingAgg._count,
    averageRating: ratingAgg._avg.rating,
  };
}

export interface CategoryView {
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  advisorCount: number;
}

/** All divination categories (15), with a live per-category published-advisor count. */
export async function getCategories(): Promise<CategoryView[]> {
  const categories = await db.divinationCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      iconKey: true,
      _count: {
        select: {
          advisors: { where: { advisor: { isPublished: true } } },
        },
      },
    },
  });

  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    iconKey: c.iconKey,
    advisorCount: c._count.advisors,
  }));
}

export interface AdvisorCardView {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  excerpt: string;
  categories: { slug: string; label: string }[];
  methods: ConsultationMethod[];
  rating: { average: number; count: number } | null;
}

/** Highest-rated published advisors for the home "pickup" rail. */
export async function getFeaturedAdvisors(limit = 4): Promise<AdvisorCardView[]> {
  const advisors = await db.fortuneTellerProfile.findMany({
    where: { isPublished: true },
    orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
    take: limit,
    select: {
      slug: true,
      bio: true,
      photoUrl: true,
      ratingAverage: true,
      ratingCount: true,
      user: { select: { displayName: true, avatarUrl: true } },
      categories: {
        orderBy: { isPrimary: "desc" },
        select: { category: { select: { slug: true, name: true } } },
      },
      methods: { select: { method: true } },
    },
  });

  return advisors.map((a) => ({
    slug: a.slug,
    displayName: a.user.displayName,
    avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
    excerpt: a.bio,
    categories: a.categories.map((c) => ({
      slug: c.category.slug,
      label: c.category.name,
    })),
    methods: a.methods.map((m) => m.method),
    rating:
      a.ratingAverage != null
        ? { average: a.ratingAverage, count: a.ratingCount }
        : null,
  }));
}

export interface ServiceCardView {
  id: string;
  title: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  category: { slug: string; label: string };
  advisor: { slug: string; displayName: string; avatarUrl: string | null };
}

/** A small set of published services for the home "pickup menu" rail. */
export async function getFeaturedServices(limit = 3): Promise<ServiceCardView[]> {
  const services = await db.service.findMany({
    where: { isPublished: true, advisor: { isPublished: true } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      method: true,
      priceJpy: true,
      durationMin: true,
      category: { select: { slug: true, name: true } },
      advisor: {
        select: {
          slug: true,
          photoUrl: true,
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  return services.map((s) => ({
    id: s.id,
    title: s.title,
    method: s.method,
    priceJpy: s.priceJpy,
    durationMin: s.durationMin,
    category: { slug: s.category.slug, label: s.category.name },
    advisor: {
      slug: s.advisor.slug,
      displayName: s.advisor.user.displayName,
      avatarUrl: s.advisor.photoUrl ?? s.advisor.user.avatarUrl ?? null,
    },
  }));
}

export interface BlogCardView {
  slug: string;
  title: string;
  excerpt: string | null;
  thumbnailUrl: string | null;
  category: { slug: string; label: string };
  author: { slug: string | null; displayName: string; avatarUrl: string | null };
  publishedAt: Date;
}

/** Latest PUBLISHED posts (excludes draft/scheduled/archived) for the home blog rail. */
export async function getLatestPosts(limit = 3): Promise<BlogCardView[]> {
  const posts = await db.blogPost.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null, lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      thumbnailUrl: true,
      publishedAt: true,
      category: { select: { slug: true, name: true } },
      author: { select: { displayName: true, avatarUrl: true } },
      advisorProfile: { select: { slug: true } },
    },
  });

  return posts
    .filter((p): p is typeof p & { publishedAt: Date } => p.publishedAt != null)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      thumbnailUrl: p.thumbnailUrl,
      category: { slug: p.category.slug, label: p.category.name },
      author: {
        slug: p.advisorProfile?.slug ?? null,
        displayName: p.author.displayName,
        avatarUrl: p.author.avatarUrl,
      },
      publishedAt: p.publishedAt,
    }));
}

// ---------------------------------------------------------------------------
// Live activity ticker (motion v1.2.0) — home "LIVE" marquee
// ---------------------------------------------------------------------------

/** A single ticker entry. `kind` drives the icon; `label` is already privacy-safe. */
export interface ActivityItem {
  kind: "advisor" | "review" | "post";
  /** Display string. Contains NO 要配慮情報 / PII (see getRecentActivity §12). */
  label: string;
  /** Optional rating value for review entries (★ count). */
  rating?: number;
  at: Date;
}

/**
 * getRecentActivity — recent public happenings for the home LIVE ticker.
 *
 * Privacy (§12): this surface is PUBLIC, so it MUST NOT leak 要配慮情報 or PII.
 * - 新規占い師登録: advisor 表示名 のみ（公開プロフィールの公開情報）。
 * - 新着レビュー: 占い師の表示名 + ★評価 のみ。レビュー本文 (comment)・投稿者名
 *   (legacyAuthorName / author) は **読み出さない**（相談・個人を特定しうるため）。
 * - 新着コラム公開: 記事タイトル のみ（既に公開されている情報）。
 * 相談 (ConsultationRequest) / summary は一切参照しない。
 *
 * 公開対象のみ（isPublished / PUBLISHED）。時系列降順で最大 `limit` 件。
 */
export async function getRecentActivity(limit = 12): Promise<ActivityItem[]> {
  const now = new Date();
  const [advisors, reviews, posts] = await Promise.all([
    db.fortuneTellerProfile.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { createdAt: true, user: { select: { displayName: true } } },
    }),
    db.review.findMany({
      // Only reviews of published advisors; comment / author intentionally omitted.
      where: { advisor: { isPublished: true } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        createdAt: true,
        rating: true,
        advisor: { select: { user: { select: { displayName: true } } } },
      },
    }),
    db.blogPost.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null, lte: now } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { title: true, publishedAt: true },
    }),
  ]);

  const items: ActivityItem[] = [
    ...advisors.map((a) => ({
      kind: "advisor" as const,
      label: `${a.user.displayName} さんが新しく登録しました`,
      at: a.createdAt,
    })),
    ...reviews.map((r) => ({
      kind: "review" as const,
      label: `${r.advisor.user.displayName} さんに新しいレビューが届きました`,
      rating: r.rating,
      at: r.createdAt,
    })),
    ...posts
      .filter((p): p is typeof p & { publishedAt: Date } => p.publishedAt != null)
      .map((p) => ({
        kind: "post" as const,
        label: `新着コラム「${p.title}」を公開しました`,
        at: p.publishedAt,
      })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

// ===========================================================================
// Wave 3a — catalog search / filter / detail (spec §2, §4.1; ADR-2)
// ===========================================================================

/** All consultation methods (spec §6: 5 形式) for filter UI population. */
export const CONSULTATION_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

/** Advisor list sort keys (AC-B3: おすすめ / 新着 / 評価). */
export type AdvisorSort = "recommended" | "newest" | "rating";
/** Service list sort keys. */
export type ServiceSort = "recommended" | "newest" | "price_asc" | "price_desc";

export interface AdvisorSearchParams {
  /** DivinationCategorySlug (uppercased enum value). */
  category?: DivinationCategorySlug;
  /** Consultation method filter. */
  method?: ConsultationMethod;
  /** Inclusive price floor (matches advisors having any service >= this). */
  priceMin?: number;
  /** Inclusive price ceiling (matches advisors having any service <= this). */
  priceMax?: number;
  /** Minimum rating average (e.g. 4 → ratingAverage >= 4). */
  ratingMin?: number;
  /** Keyword (name / bio / service title) — pg_trgm ILIKE (ADR-2). */
  q?: string;
  sort?: AdvisorSort;
  page?: number;
  perPage?: number;
}

export interface AdvisorSearchResult {
  advisors: AdvisorCardView[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const ADVISOR_CARD_SELECT = {
  slug: true,
  bio: true,
  photoUrl: true,
  ratingAverage: true,
  ratingCount: true,
  createdAt: true,
  user: { select: { displayName: true, avatarUrl: true } },
  categories: {
    orderBy: { isPrimary: "desc" },
    select: { category: { select: { slug: true, name: true } } },
  },
  methods: { select: { method: true } },
} satisfies Prisma.FortuneTellerProfileSelect;

type AdvisorCardRow = Prisma.FortuneTellerProfileGetPayload<{
  select: typeof ADVISOR_CARD_SELECT;
}>;

function toAdvisorCard(a: AdvisorCardRow): AdvisorCardView {
  return {
    slug: a.slug,
    displayName: a.user.displayName,
    avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
    excerpt: a.bio,
    categories: a.categories.map((c) => ({
      slug: c.category.slug,
      label: c.category.name,
    })),
    methods: a.methods.map((m) => m.method),
    rating:
      a.ratingAverage != null
        ? { average: a.ratingAverage, count: a.ratingCount }
        : null,
  };
}

/**
 * BlogCategory.slug → DivinationCategorySlug マッピング。
 * 運営記事末尾の「同じ専門領域の占い師」表示用のヒューリスティック表。
 * 未マッピングのカテゴリは全体ランキングでフォールバック。
 */
const BLOG_CATEGORY_TO_DIVINATION: Record<string, DivinationCategorySlug> = {
  // WP 由来カテゴリ
  "wp-angel-number": "SPIRITUAL_SENSE",
  "wp-power-stone": "SPIRITUAL",
  "wp-oneiromancy": "SPIRITUAL_SENSE",
  // seed カテゴリ
  spiritual: "SPIRITUAL",
  money: "FENG_SHUI",
};

/**
 * 運営記事末尾の「おすすめの占い師」セクション用。
 * 記事カテゴリと同じ専門領域 (DivinationCategorySlug マッピング) の公開占い師を優先し、
 * 不足分は全体ランキングで補完する。
 */
export async function getRecommendedAdvisorsForBlogPost(
  blogCategorySlug: string,
  limit = 3
): Promise<AdvisorCardView[]> {
  const divSlug = BLOG_CATEGORY_TO_DIVINATION[blogCategorySlug];
  const matched: AdvisorCardRow[] = divSlug
    ? await db.fortuneTellerProfile.findMany({
        where: {
          isPublished: true,
          categories: { some: { category: { slug: divSlug } } },
        },
        orderBy: [
          { ratingAverage: { sort: "desc", nulls: "last" } },
          { ratingCount: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        select: ADVISOR_CARD_SELECT,
      })
    : [];
  if (matched.length >= limit) return matched.map(toAdvisorCard);

  const seen = matched.map((a) => a.slug);
  const fill: AdvisorCardRow[] = await db.fortuneTellerProfile.findMany({
    where: { isPublished: true, slug: { notIn: seen } },
    orderBy: [
      { ratingAverage: { sort: "desc", nulls: "last" } },
      { ratingCount: "desc" },
      { createdAt: "desc" },
    ],
    take: limit - matched.length,
    select: ADVISOR_CARD_SELECT,
  });
  return [...matched, ...fill].map(toAdvisorCard);
}

/**
 * searchAdvisors (ADR-2): keyword search + structured AND filters + sort +
 * pagination, all server-side (PERF-5). Returns a live result set + total
 * count for "結果件数表示". No 要配慮情報 (consultation summaries) is ever read.
 *
 * Keyword path uses PostgreSQL `pg_trgm` ILIKE across 占い師名 (User.displayName),
 * 自己紹介 (FortuneTellerProfile.bio) and サービス名 (Service.title). The trigram
 * GIN indexes (migration `add_pg_trgm_search_indexes`) make the ILIKE matches
 * index-assisted. The candidate-id set is then intersected with the structured
 * Prisma filter so name/bio/service matches stay consistent with the other facets.
 */
export async function searchAdvisors(
  params: AdvisorSearchParams
): Promise<AdvisorSearchResult> {
  const perPage = Math.min(Math.max(params.perPage ?? 12, 1), 48);
  const page = Math.max(params.page ?? 1, 1);
  const q = params.q?.trim();

  // Structured AND filter (spec §4.1). Always restricts to published advisors.
  const where: Prisma.FortuneTellerProfileWhereInput = { isPublished: true };
  const and: Prisma.FortuneTellerProfileWhereInput[] = [];

  if (params.category) {
    and.push({ categories: { some: { category: { slug: params.category } } } });
  }
  if (params.method) {
    and.push({ methods: { some: { method: params.method } } });
  }
  if (params.ratingMin != null) {
    and.push({ ratingAverage: { gte: params.ratingMin } });
  }
  if (params.priceMin != null || params.priceMax != null) {
    const price: Prisma.IntFilter = {};
    if (params.priceMin != null) price.gte = params.priceMin;
    if (params.priceMax != null) price.lte = params.priceMax;
    and.push({
      services: { some: { isPublished: true, priceJpy: price } },
    });
  }

  // Keyword path (ADR-2 pg_trgm). Resolve matching advisor ids via ILIKE across
  // name / bio / service title, then AND that id-set into the structured query.
  if (q) {
    const ids = await advisorIdsMatchingKeyword(q);
    if (ids.length === 0) {
      return { advisors: [], total: 0, page, perPage, totalPages: 0 };
    }
    and.push({ id: { in: ids } });
  }

  if (and.length > 0) where.AND = and;

  const orderBy: Prisma.FortuneTellerProfileOrderByWithRelationInput[] =
    params.sort === "newest"
      ? [{ createdAt: "desc" }]
      : params.sort === "rating"
        ? [{ ratingAverage: "desc" }, { ratingCount: "desc" }]
        : // recommended (default): rating then volume
          [{ ratingAverage: "desc" }, { ratingCount: "desc" }, { createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    db.fortuneTellerProfile.count({ where }),
    db.fortuneTellerProfile.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: ADVISOR_CARD_SELECT,
    }),
  ]);

  return {
    advisors: rows.map(toAdvisorCard),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * pg_trgm keyword match (ADR-2): returns the ids of published advisors whose
 * 名前 / 自己紹介 / 提供サービス名 match the keyword via ILIKE. Parameterized to
 * prevent injection; `%` / `_` in the term are escaped so they are literal.
 */
async function advisorIdsMatchingKeyword(term: string): Promise<string[]> {
  const escaped = term.replace(/[\\%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT p."id"
    FROM "FortuneTellerProfile" p
    JOIN "User" u ON u."id" = p."userId"
    LEFT JOIN "Service" s
      ON s."advisorId" = p."id" AND s."isPublished" = true
    WHERE p."isPublished" = true
      AND (
        u."displayName" ILIKE ${pattern} ESCAPE '\'
        OR p."bio" ILIKE ${pattern} ESCAPE '\'
        OR s."title" ILIKE ${pattern} ESCAPE '\'
      )
  `;
  return rows.map((r) => r.id);
}

export interface ServiceSearchParams {
  category?: DivinationCategorySlug;
  method?: ConsultationMethod;
  priceMin?: number;
  priceMax?: number;
  sort?: ServiceSort;
  page?: number;
  perPage?: number;
}

export interface ServiceSearchResult {
  services: ServiceCardView[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * searchServices (AC-B2/B3): published services with structured AND filters,
 * sort and pagination, all server-side. Only services whose advisor is also
 * published are returned.
 */
export async function searchServices(
  params: ServiceSearchParams
): Promise<ServiceSearchResult> {
  const perPage = Math.min(Math.max(params.perPage ?? 12, 1), 48);
  const page = Math.max(params.page ?? 1, 1);

  const where: Prisma.ServiceWhereInput = {
    isPublished: true,
    advisor: { isPublished: true },
  };
  if (params.category) where.category = { slug: params.category };
  if (params.method) where.method = params.method;
  if (params.priceMin != null || params.priceMax != null) {
    where.priceJpy = {};
    if (params.priceMin != null) where.priceJpy.gte = params.priceMin;
    if (params.priceMax != null) where.priceJpy.lte = params.priceMax;
  }

  const orderBy: Prisma.ServiceOrderByWithRelationInput[] =
    params.sort === "price_asc"
      ? [{ priceJpy: "asc" }]
      : params.sort === "price_desc"
        ? [{ priceJpy: "desc" }]
        : params.sort === "newest"
          ? [{ createdAt: "desc" }]
          : [{ createdAt: "desc" }]; // recommended (default)

  const [total, rows] = await Promise.all([
    db.service.count({ where }),
    db.service.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        method: true,
        priceJpy: true,
        durationMin: true,
        category: { select: { slug: true, name: true } },
        advisor: {
          select: {
            slug: true,
            photoUrl: true,
            user: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
  ]);

  return {
    services: rows.map((s) => ({
      id: s.id,
      title: s.title,
      method: s.method,
      priceJpy: s.priceJpy,
      durationMin: s.durationMin,
      category: { slug: s.category.slug, label: s.category.name },
      advisor: {
        slug: s.advisor.slug,
        displayName: s.advisor.user.displayName,
        avatarUrl: s.advisor.photoUrl ?? s.advisor.user.avatarUrl ?? null,
      },
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

// ---------------------------------------------------------------------------
// Detail views
// ---------------------------------------------------------------------------

export interface AdvisorReviewView {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface AdvisorServiceView {
  id: string;
  title: string;
  description: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  category: { slug: string; label: string };
}

export interface AdvisorPostView {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date;
}

export interface AdvisorDetailView {
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  experience: string | null;
  categories: { slug: string; label: string; isPrimary: boolean }[];
  methods: ConsultationMethod[];
  rating: { average: number; count: number } | null;
  services: AdvisorServiceView[];
  posts: AdvisorPostView[];
  reviews: AdvisorReviewView[];
}

/**
 * Full advisor profile (AC-B4, C4 統合): profile + published services +
 * the advisor's own PUBLISHED posts + reviews (legacyAuthorName supported).
 * Single batched read (PERF-7, no N+1). Returns null for unknown/unpublished.
 */
export async function getAdvisorDetail(
  slug: string
): Promise<AdvisorDetailView | null> {
  const a = await db.fortuneTellerProfile.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      bio: true,
      experience: true,
      photoUrl: true,
      ratingAverage: true,
      ratingCount: true,
      user: { select: { displayName: true, avatarUrl: true } },
      categories: {
        orderBy: { isPrimary: "desc" },
        select: {
          isPrimary: true,
          category: { select: { slug: true, name: true } },
        },
      },
      methods: { select: { method: true } },
      services: {
        where: { isPublished: true },
        orderBy: { priceJpy: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          method: true,
          priceJpy: true,
          durationMin: true,
          category: { select: { slug: true, name: true } },
        },
      },
      blogPosts: {
        where: {
          status: "PUBLISHED",
          publishedAt: { not: null, lte: new Date() },
        },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, title: true, excerpt: true, publishedAt: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          legacyAuthorName: true,
          author: { select: { displayName: true } },
        },
      },
    },
  });

  if (!a) return null;

  return {
    slug: a.slug,
    displayName: a.user.displayName,
    avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
    bio: a.bio,
    experience: a.experience,
    categories: a.categories.map((c) => ({
      slug: c.category.slug,
      label: c.category.name,
      isPrimary: c.isPrimary,
    })),
    methods: a.methods.map((m) => m.method),
    rating:
      a.ratingAverage != null
        ? { average: a.ratingAverage, count: a.ratingCount }
        : null,
    services: a.services.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      method: s.method,
      priceJpy: s.priceJpy,
      durationMin: s.durationMin,
      category: { slug: s.category.slug, label: s.category.name },
    })),
    posts: a.blogPosts
      .filter(
        (p): p is typeof p & { publishedAt: Date } => p.publishedAt != null
      )
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
      })),
    reviews: a.reviews.map((r) => ({
      id: r.id,
      authorName: r.author?.displayName ?? r.legacyAuthorName ?? "匿名",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
}

/** Lightweight advisor identity for metadata/JSON-LD without the full payload. */
export async function getAdvisorSeo(
  slug: string
): Promise<{ slug: string; displayName: string; bio: string; photoUrl: string | null } | null> {
  const a = await db.fortuneTellerProfile.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      bio: true,
      photoUrl: true,
      user: { select: { displayName: true, avatarUrl: true } },
    },
  });
  if (!a) return null;
  return {
    slug: a.slug,
    displayName: a.user.displayName,
    bio: a.bio,
    photoUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
  };
}

export interface ServiceDetailView {
  id: string;
  title: string;
  description: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  category: { slug: string; label: string };
  advisor: {
    slug: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string;
  };
}

/**
 * Full service detail (AC-B5). Restricted to published services whose advisor
 * is also published. Returns null otherwise.
 */
export async function getServiceDetail(
  id: string
): Promise<ServiceDetailView | null> {
  const s = await db.service.findFirst({
    where: { id, isPublished: true, advisor: { isPublished: true } },
    select: {
      id: true,
      title: true,
      description: true,
      method: true,
      priceJpy: true,
      durationMin: true,
      category: { select: { slug: true, name: true } },
      advisor: {
        select: {
          slug: true,
          bio: true,
          photoUrl: true,
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!s) return null;
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    method: s.method,
    priceJpy: s.priceJpy,
    durationMin: s.durationMin,
    category: { slug: s.category.slug, label: s.category.name },
    advisor: {
      slug: s.advisor.slug,
      displayName: s.advisor.user.displayName,
      avatarUrl: s.advisor.photoUrl ?? s.advisor.user.avatarUrl ?? null,
      bio: s.advisor.bio,
    },
  };
}

/** Single category by slug, for /advisors/categories/[slug] header + SEO. */
export async function getCategoryBySlug(
  slug: DivinationCategorySlug
): Promise<{ slug: string; name: string; description: string | null } | null> {
  const c = await db.divinationCategory.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true },
  });
  return c;
}

/** Whether a GENERAL user has favorited a given advisor (slug). */
export async function isAdvisorFavorited(
  userId: string,
  advisorSlug: string
): Promise<boolean> {
  const advisor = await db.fortuneTellerProfile.findUnique({
    where: { slug: advisorSlug },
    select: { id: true },
  });
  if (!advisor) return false;
  const fav = await db.favorite.findUnique({
    where: { userId_advisorId: { userId, advisorId: advisor.id } },
    select: { userId: true },
  });
  return fav != null;
}

// ===========================================================================
// Wave 3b — booking / matching / mypage / notifications (spec §4.1, §4.3, B-8)
// ===========================================================================

export interface BookingTargetServiceView {
  id: string;
  title: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  category: { slug: string; label: string };
}

export interface BookingTargetView {
  /** FortuneTellerProfile.id (server-resolved; never trusted from the client). */
  advisorId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  /** Consultation methods the advisor actually offers (form options). */
  methods: ConsultationMethod[];
  services: BookingTargetServiceView[];
}

/**
 * Resolve a published advisor (by slug) into the data the BookingRequestForm
 * needs: identity, the AdvisorMethod set (form 相談形式 options, spec §4.1) and
 * the advisor's published services (optional service pre-selection). Returns
 * null for unknown / unpublished advisors so the route can 404. No 要配慮情報.
 */
export async function getBookingTarget(
  slug: string
): Promise<BookingTargetView | null> {
  const a = await db.fortuneTellerProfile.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      photoUrl: true,
      user: { select: { displayName: true, avatarUrl: true } },
      methods: { select: { method: true } },
      services: {
        where: { isPublished: true },
        orderBy: { priceJpy: "asc" },
        select: {
          id: true,
          title: true,
          method: true,
          priceJpy: true,
          durationMin: true,
          category: { select: { slug: true, name: true } },
        },
      },
    },
  });
  if (!a) return null;
  return {
    advisorId: a.id,
    slug: a.slug,
    displayName: a.user.displayName,
    avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
    methods: a.methods.map((m) => m.method),
    services: a.services.map((s) => ({
      id: s.id,
      title: s.title,
      method: s.method,
      priceJpy: s.priceJpy,
      durationMin: s.durationMin,
      category: { slug: s.category.slug, label: s.category.name },
    })),
  };
}

/**
 * A GENERAL user's favorited advisors (mypage お気に入り一覧, AC-B8).
 * Reuses the AdvisorCardView shape so FortuneTellerCard renders them.
 */
export async function getFavoriteAdvisors(
  userId: string
): Promise<AdvisorCardView[]> {
  const favorites = await db.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      advisor: {
        select: {
          slug: true,
          bio: true,
          photoUrl: true,
          ratingAverage: true,
          ratingCount: true,
          isPublished: true,
          user: { select: { displayName: true, avatarUrl: true } },
          categories: {
            orderBy: { isPrimary: "desc" },
            select: { category: { select: { slug: true, name: true } } },
          },
          methods: { select: { method: true } },
        },
      },
    },
  });

  return favorites
    .map((f) => f.advisor)
    .filter((a) => a.isPublished)
    .map((a) => ({
      slug: a.slug,
      displayName: a.user.displayName,
      avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
      excerpt: a.bio,
      categories: a.categories.map((c) => ({
        slug: c.category.slug,
        label: c.category.name,
      })),
      methods: a.methods.map((m) => m.method),
      rating:
        a.ratingAverage != null
          ? { average: a.ratingAverage, count: a.ratingCount }
          : null,
    }));
}

export interface MyRequestView {
  id: string;
  status: ConsultationStatus;
  method: ConsultationMethod;
  createdAt: Date;
  respondedAt: Date | null;
  /** 占い師の応答メッセージ（承認/辞退理由等）。要配慮ではない運用メッセージ。 */
  responseMessage: string | null;
  /** RESCHEDULED 時に占い師が提案した日時。 */
  proposedSlot: Date | null;
  advisor: { slug: string; displayName: string; avatarUrl: string | null };
  service: { id: string; title: string } | null;
  preferredSlots: Date[];
  /** ユーザー自身が取消できるか（pending / rescheduled のみ）。 */
  cancellable: boolean;
}

/**
 * A requester's own consultation requests for /mypage (AC-B8).
 *
 * 重要 (§12): 一覧 API は `summary`（要配慮情報）を **含めない**。状態・相手・
 * 希望日時候補・占い師の応答のみを返す。summary は所有者本人の詳細取得でのみ
 * 読める（getMyRequestDetail）。
 */
export async function getMyRequests(userId: string): Promise<MyRequestView[]> {
  const rows = await db.consultationRequest.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      method: true,
      createdAt: true,
      respondedAt: true,
      responseMessage: true,
      proposedSlot: true,
      advisor: {
        select: {
          slug: true,
          photoUrl: true,
          user: { select: { displayName: true, avatarUrl: true } },
        },
      },
      service: { select: { id: true, title: true } },
      preferredSlots: {
        orderBy: { sortOrder: "asc" },
        select: { slot: true },
      },
      // NOTE: summary は意図的に select しない（§12 一覧に要配慮情報を含めない）。
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    method: r.method,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    responseMessage: r.responseMessage,
    proposedSlot: r.proposedSlot,
    advisor: {
      slug: r.advisor.slug,
      displayName: r.advisor.user.displayName,
      avatarUrl: r.advisor.photoUrl ?? r.advisor.user.avatarUrl ?? null,
    },
    service: r.service ? { id: r.service.id, title: r.service.title } : null,
    preferredSlots: r.preferredSlots.map((s) => s.slot),
    cancellable: r.status === "PENDING" || r.status === "RESCHEDULED",
  }));
}

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

/** A user's in-app notifications (newest first, AC-B7-6). */
export async function getNotifications(
  userId: string,
  limit = 30
): Promise<NotificationView[]> {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      isRead: true,
      createdAt: true,
    },
  });
}

/** Unread notification count for the header bell badge. */
export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  return db.notification.count({ where: { userId, isRead: false } });
}

// ===========================================================================
// Wave 3c — advisor dashboard / received requests / profile & service mgmt /
//           minimal admin (spec §3 RBAC, §5.1, §12)
// ===========================================================================

/**
 * 現在ユーザーが所有する FortuneTellerProfile.id を解決する（SEC-3 所有権の起点）.
 * 占い師ダッシュボード系のすべての所有権検証はこの id を基準に行う。プロフィール
 * 未作成（登録途中）の占い師は null を返す。
 */
export async function getOwnedAdvisorProfileId(
  userId: string
): Promise<string | null> {
  const profile = await db.fortuneTellerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export interface AdvisorDashboardStats {
  /** 自分宛リクエスト総数。 */
  totalRequests: number;
  /** 未対応（PENDING）件数 — 要対応の主指標。 */
  pendingRequests: number;
  /** 日程調整中（RESCHEDULED）件数。 */
  rescheduledRequests: number;
  /** 公開中サービス数。 */
  publishedServices: number;
  /** 総サービス数（非公開含む）。 */
  totalServices: number;
  /** 自分の公開記事数。 */
  publishedPosts: number;
  /** プロフィール公開状態。 */
  isPublished: boolean;
}

/**
 * 占い師ダッシュボード概要（実DB集計）. すべて COUNT 集計で、ハードコード値を含めない。
 * advisorProfileId は呼び出し側でサーバ解決済みの自分の profile.id を渡す（SEC-3）。
 */
export async function getAdvisorDashboardStats(
  advisorProfileId: string
): Promise<AdvisorDashboardStats> {
  const [
    totalRequests,
    pendingRequests,
    rescheduledRequests,
    publishedServices,
    totalServices,
    publishedPosts,
    profile,
  ] = await Promise.all([
    db.consultationRequest.count({ where: { advisorId: advisorProfileId } }),
    db.consultationRequest.count({
      where: { advisorId: advisorProfileId, status: "PENDING" },
    }),
    db.consultationRequest.count({
      where: { advisorId: advisorProfileId, status: "RESCHEDULED" },
    }),
    db.service.count({
      where: { advisorId: advisorProfileId, isPublished: true },
    }),
    db.service.count({ where: { advisorId: advisorProfileId } }),
    db.blogPost.count({
      where: { advisorProfileId, status: "PUBLISHED" },
    }),
    db.fortuneTellerProfile.findUnique({
      where: { id: advisorProfileId },
      select: { isPublished: true },
    }),
  ]);

  return {
    totalRequests,
    pendingRequests,
    rescheduledRequests,
    publishedServices,
    totalServices,
    publishedPosts,
    isPublished: profile?.isPublished ?? false,
  };
}

export interface AdvisorRequestView {
  id: string;
  status: ConsultationStatus;
  method: ConsultationMethod;
  /**
   * 相談概要（要配慮情報, §12）. 宛先占い師（本一覧の所有者）は閲覧可。
   * 取得経路で所有権検証済みのデータにのみ含める。慎重表示すること。
   */
  summary: string;
  createdAt: Date;
  respondedAt: Date | null;
  responseMessage: string | null;
  proposedSlot: Date | null;
  requester: { displayName: string; avatarUrl: string | null };
  service: { id: string; title: string } | null;
  preferredSlots: Date[];
  /** 占い師が応答可能か（PENDING / RESCHEDULED のみ）。 */
  actionable: boolean;
}

/**
 * 占い師が受信したリクエスト一覧（AC-B7-3/4/5, spec §5.1）.
 *
 * 重要 (§12): summary は要配慮情報だが、**宛先占い師は閲覧主体**なので含める。
 * advisorProfileId は呼び出し側でサーバ解決した「自分の profile.id」のみ渡すこと
 * （他人の profile.id を渡せば他人の相談が読めてしまうため、解決責務は呼び出し側）。
 * status フィルタは任意（ダッシュボードのタブ用）。
 */
export async function getAdvisorRequests(
  advisorProfileId: string,
  status?: ConsultationStatus
): Promise<AdvisorRequestView[]> {
  const rows = await db.consultationRequest.findMany({
    where: { advisorId: advisorProfileId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      method: true,
      summary: true,
      createdAt: true,
      respondedAt: true,
      responseMessage: true,
      proposedSlot: true,
      requester: { select: { displayName: true, avatarUrl: true } },
      service: { select: { id: true, title: true } },
      preferredSlots: {
        orderBy: { sortOrder: "asc" },
        select: { slot: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    method: r.method,
    summary: r.summary,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    responseMessage: r.responseMessage,
    proposedSlot: r.proposedSlot,
    requester: {
      displayName: r.requester.displayName,
      avatarUrl: r.requester.avatarUrl,
    },
    service: r.service ? { id: r.service.id, title: r.service.title } : null,
    preferredSlots: r.preferredSlots.map((s) => s.slot),
    actionable: r.status === "PENDING" || r.status === "RESCHEDULED",
  }));
}

export interface AdvisorOwnProfileView {
  advisorId: string;
  slug: string;
  displayName: string;
  bio: string;
  experience: string | null;
  photoUrl: string | null;
  isPublished: boolean;
  /** 全占術カテゴリでの選択状態（編集フォーム用）。 */
  categories: {
    id: string;
    slug: string;
    name: string;
    selected: boolean;
    isPrimary: boolean;
  }[];
  /** 全相談形式での選択状態（編集フォーム用）。 */
  methods: { method: ConsultationMethod; selected: boolean }[];
}

/**
 * 自分の占い師プロフィール（編集フォーム用, AC-B9-1）. 全カテゴリ/全 method を
 * 列挙し選択状態を付与する（フォームのチェックボックス描画用）。所有権は呼び出し側で
 * 解決済みの advisorProfileId に依存（SEC-3）。
 */
export async function getAdvisorOwnProfile(
  advisorProfileId: string
): Promise<AdvisorOwnProfileView | null> {
  const [profile, allCategories] = await Promise.all([
    db.fortuneTellerProfile.findUnique({
      where: { id: advisorProfileId },
      select: {
        id: true,
        slug: true,
        bio: true,
        experience: true,
        photoUrl: true,
        isPublished: true,
        user: { select: { displayName: true } },
        categories: { select: { categoryId: true, isPrimary: true } },
        methods: { select: { method: true } },
      },
    }),
    db.divinationCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    }),
  ]);
  if (!profile) return null;

  const selectedById = new Map(
    profile.categories.map((c) => [c.categoryId, c.isPrimary])
  );
  const selectedMethods = new Set(profile.methods.map((m) => m.method));

  return {
    advisorId: profile.id,
    slug: profile.slug,
    displayName: profile.user.displayName,
    bio: profile.bio,
    experience: profile.experience,
    photoUrl: profile.photoUrl,
    isPublished: profile.isPublished,
    categories: allCategories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      selected: selectedById.has(c.id),
      isPrimary: selectedById.get(c.id) === true,
    })),
    methods: CONSULTATION_METHODS.map((m) => ({
      method: m,
      selected: selectedMethods.has(m),
    })),
  };
}

export interface AdvisorOwnServiceView {
  id: string;
  title: string;
  description: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  isPublished: boolean;
  category: { id: string; slug: string; label: string };
}

/**
 * 自分のサービス一覧（非公開含む, AC-B9-2）. 所有権は呼び出し側で解決済みの
 * advisorProfileId に依存（SEC-3）。
 */
export async function getAdvisorOwnServices(
  advisorProfileId: string
): Promise<AdvisorOwnServiceView[]> {
  const rows = await db.service.findMany({
    where: { advisorId: advisorProfileId },
    orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      description: true,
      method: true,
      priceJpy: true,
      durationMin: true,
      isPublished: true,
      category: { select: { id: true, slug: true, name: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    method: s.method,
    priceJpy: s.priceJpy,
    durationMin: s.durationMin,
    isPublished: s.isPublished,
    category: { id: s.category.id, slug: s.category.slug, label: s.category.name },
  }));
}

/** 全占術カテゴリ（サービス編集フォームの選択肢）。 */
export async function getAllCategoriesForForm(): Promise<
  { id: string; slug: string; name: string }[]
> {
  return db.divinationCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });
}

// ---------------------------------------------------------------------------
// Minimal Admin (spec §3: ユーザー/占い師/サービス管理。ブログ管理は W5)
// ---------------------------------------------------------------------------

export interface AdminStats {
  userCount: number;
  advisorCount: number;
  publishedAdvisorCount: number;
  serviceCount: number;
  requestCount: number;
  postCount: number;
}

/** 運営ダッシュボード概要（実DB集計）。 */
export async function getAdminStats(): Promise<AdminStats> {
  const [
    userCount,
    advisorCount,
    publishedAdvisorCount,
    serviceCount,
    requestCount,
    postCount,
  ] = await Promise.all([
    db.user.count(),
    db.fortuneTellerProfile.count(),
    db.fortuneTellerProfile.count({ where: { isPublished: true } }),
    db.service.count(),
    db.consultationRequest.count(),
    db.blogPost.count(),
  ]);
  return {
    userCount,
    advisorCount,
    publishedAdvisorCount,
    serviceCount,
    requestCount,
    postCount,
  };
}

// ===========================================================================
// Wave 5a — public blog (一覧 / カテゴリ / タグ / 記事詳細 / 著者アーカイブ)
//           spec §2, §4.2, §5.2; ADR-1 compute-on-read, ADR-2 pg_trgm
// ===========================================================================

/**
 * ADR-1 公開判定 (compute-on-read). 「公開」= `status=PUBLISHED OR
 * (status=SCHEDULED AND publishedAt <= now())`. scheduler 故障時も公開漏れが
 * 構造的に起きない。DRAFT / ARCHIVED / 未来 SCHEDULED は公開しない。
 *
 * すべての公開ブログクエリ（一覧 / カテゴリ / タグ / 詳細 / 関連 / 著者アーカイブ /
 * 将来の sitemap）はこの述語を経由して公開集合を定義すること。`now` 引数は
 * テスト容易性のためのもので、通常は呼び出し時刻を使う。
 */
export function publishedPostWhere(
  now: Date = new Date()
): Prisma.BlogPostWhereInput {
  return {
    OR: [
      { status: "PUBLISHED", publishedAt: { not: null, lte: now } },
      { status: "SCHEDULED", publishedAt: { not: null, lte: now } },
    ],
  };
}

const BLOG_CARD_SELECT = {
  slug: true,
  title: true,
  excerpt: true,
  thumbnailUrl: true,
  publishedAt: true,
  category: { select: { slug: true, name: true } },
  author: { select: { displayName: true, avatarUrl: true } },
  advisorProfile: { select: { slug: true } },
} satisfies Prisma.BlogPostSelect;

type BlogCardRow = Prisma.BlogPostGetPayload<{ select: typeof BLOG_CARD_SELECT }>;

/** Map a DB row to the BlogCardView the BlogCard component consumes. */
function toBlogCard(
  p: BlogCardRow & { publishedAt: Date }
): BlogCardView {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    thumbnailUrl: p.thumbnailUrl,
    category: { slug: p.category.slug, label: p.category.name },
    author: {
      slug: p.advisorProfile?.slug ?? null,
      displayName: p.author.displayName,
      avatarUrl: p.author.avatarUrl,
    },
    publishedAt: p.publishedAt,
  };
}

export interface PostSearchParams {
  /** Keyword (title / excerpt) — pg_trgm ILIKE (ADR-2). */
  q?: string;
  /** Restrict to a BlogCategory.slug (category landing). */
  categorySlug?: string;
  /** Restrict to a BlogTag.slug (tag landing). */
  tagSlug?: string;
  page?: number;
  perPage?: number;
}

export interface PostSearchResult {
  posts: BlogCardView[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * searchPosts (AC-C1-1/5/6): 公開記事の一覧。新着順 (publishedAt desc)、
 * ページネーション、キーワード検索 (title / excerpt, ADR-2 pg_trgm ILIKE)。
 * category / tag landing からも同じ関数で絞り込む。公開判定は
 * `publishedPostWhere()` で統一（compute-on-read, ADR-1）。
 */
export async function searchPosts(
  params: PostSearchParams
): Promise<PostSearchResult> {
  const perPage = Math.min(Math.max(params.perPage ?? 9, 1), 48);
  const page = Math.max(params.page ?? 1, 1);
  const q = params.q?.trim();

  const and: Prisma.BlogPostWhereInput[] = [publishedPostWhere()];

  if (params.categorySlug) {
    and.push({ category: { slug: params.categorySlug } });
  }
  if (params.tagSlug) {
    and.push({ tags: { some: { tag: { slug: params.tagSlug } } } });
  }

  // Keyword path (ADR-2 pg_trgm) — resolve matching post ids via ILIKE across
  // title / excerpt, then AND that id-set into the structured query so it stays
  // consistent with the published predicate + category/tag facets.
  if (q) {
    const ids = await postIdsMatchingKeyword(q);
    if (ids.length === 0) {
      return { posts: [], total: 0, page, perPage, totalPages: 0 };
    }
    and.push({ id: { in: ids } });
  }

  const where: Prisma.BlogPostWhereInput = { AND: and };

  const [total, rows] = await Promise.all([
    db.blogPost.count({ where }),
    db.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: BLOG_CARD_SELECT,
    }),
  ]);

  return {
    posts: rows
      .filter((p): p is BlogCardRow & { publishedAt: Date } => p.publishedAt != null)
      .map(toBlogCard),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * pg_trgm keyword match (ADR-2): ids of *published* posts whose title / excerpt
 * match the keyword via ILIKE. The published predicate is enforced in SQL so the
 * id-set never contains draft / archived / future-scheduled posts even before the
 * Prisma AND-intersection. Parameterized; `%` / `_` are escaped so they stay literal.
 */
async function postIdsMatchingKeyword(term: string): Promise<string[]> {
  const escaped = term.replace(/[\\%_]/g, (m) => `\\${m}`);
  const pattern = `%${escaped}%`;
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT p."id"
    FROM "BlogPost" p
    WHERE p."publishedAt" IS NOT NULL
      AND p."publishedAt" <= NOW()
      AND p."status" IN ('PUBLISHED', 'SCHEDULED')
      AND (
        p."title" ILIKE ${pattern} ESCAPE '\'
        OR p."excerpt" ILIKE ${pattern} ESCAPE '\'
      )
  `;
  return rows.map((r) => r.id);
}

export interface BlogTaxonomyView {
  slug: string;
  name: string;
  description: string | null;
}

/** Single BlogCategory by slug, for /blog/category/[slug] header + SEO (or null = 404). */
export async function getBlogCategoryBySlug(
  slug: string
): Promise<BlogTaxonomyView | null> {
  const c = await db.blogCategory.findUnique({
    where: { slug },
    select: { slug: true, name: true, description: true },
  });
  return c;
}

/** Single BlogTag by slug, for /blog/tag/[slug] header + SEO (or null = 404). */
export async function getBlogTagBySlug(
  slug: string
): Promise<BlogTaxonomyView | null> {
  const t = await db.blogTag.findUnique({
    where: { slug },
    select: { slug: true, name: true },
  });
  if (!t) return null;
  return { slug: t.slug, name: t.name, description: null };
}

export interface BlogCategoryChip {
  slug: string;
  name: string;
  postCount: number;
}

/** Blog categories with a live published-post count, for the /blog chip rail (AC-C1). */
export async function getBlogCategoriesWithCounts(): Promise<BlogCategoryChip[]> {
  const published = publishedPostWhere();
  const categories = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { posts: { where: published } } },
    },
  });
  return categories
    .map((c) => ({ slug: c.slug, name: c.name, postCount: c._count.posts }))
    .filter((c) => c.postCount > 0);
}

export interface BlogTagChip {
  slug: string;
  name: string;
  postCount: number;
}

/** Blog tags that have at least one published post, for the /blog chip rail (AC-C1). */
export async function getBlogTagsWithCounts(): Promise<BlogTagChip[]> {
  const published = publishedPostWhere();
  const tags = await db.blogTag.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { posts: { where: { post: published } } } },
    },
  });
  return tags
    .map((t) => ({ slug: t.slug, name: t.name, postCount: t._count.posts }))
    .filter((t) => t.postCount > 0);
}

export interface PostDetailView {
  slug: string;
  title: string;
  excerpt: string | null;
  /** サニタイズ済 HTML（SEC-5）。生 JSON は描画に使わない。 */
  contentHtml: string;
  thumbnailUrl: string | null;
  publishedAt: Date;
  updatedAt: Date;
  /** SEO 上書き（任意, AC-C2-8）。 */
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  category: { slug: string; label: string };
  tags: { slug: string; label: string }[];
  /**
   * 著者。占い師著者なら advisorSlug あり（/advisors/[slug] へリンク + 相談CTA, C-4）。
   * 運営投稿は advisorSlug=null（運営表示）。
   */
  author: {
    displayName: string;
    avatarUrl: string | null;
    advisorSlug: string | null;
  };
}

/**
 * 公開記事詳細 (AC-C1-3/4/7, spec §4.2). 公開判定は `publishedPostWhere()` で
 * 統一（compute-on-read, ADR-1）。draft / archived / 未来 scheduled は null を返し、
 * 呼び出し側で notFound する（プレビューは W5b/別途）。本文は contentHtml のみ返す。
 */
export async function getPostDetail(slug: string): Promise<PostDetailView | null> {
  const post = await db.blogPost.findFirst({
    where: { AND: [{ slug }, publishedPostWhere()] },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      contentHtml: true,
      thumbnailUrl: true,
      publishedAt: true,
      updatedAt: true,
      seoTitle: true,
      seoDescription: true,
      ogImageUrl: true,
      category: { select: { slug: true, name: true } },
      tags: {
        orderBy: { tag: { name: "asc" } },
        select: { tag: { select: { slug: true, name: true } } },
      },
      author: { select: { displayName: true, avatarUrl: true } },
      advisorProfile: { select: { slug: true } },
    },
  });
  if (!post || post.publishedAt == null) return null;

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    contentHtml: post.contentHtml,
    thumbnailUrl: post.thumbnailUrl,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    ogImageUrl: post.ogImageUrl,
    category: { slug: post.category.slug, label: post.category.name },
    tags: post.tags.map((t) => ({ slug: t.tag.slug, label: t.tag.name })),
    author: {
      displayName: post.author.displayName,
      avatarUrl: post.author.avatarUrl,
      advisorSlug: post.advisorProfile?.slug ?? null,
    },
  };
}

/**
 * 関連記事（同カテゴリの公開記事, AC-C1-3）。自記事は除外。新着順で limit 件。
 * 公開判定は `publishedPostWhere()` で統一。
 */
export async function getRelatedPosts(
  categorySlug: string,
  excludeSlug: string,
  limit = 3
): Promise<BlogCardView[]> {
  const rows = await db.blogPost.findMany({
    where: {
      AND: [
        publishedPostWhere(),
        { category: { slug: categorySlug } },
        { slug: { not: excludeSlug } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: BLOG_CARD_SELECT,
  });
  return rows
    .filter((p): p is BlogCardRow & { publishedAt: Date } => p.publishedAt != null)
    .map(toBlogCard);
}

export interface AuthorArchiveView {
  /** 著者占い師の slug（/advisors/[slug] / 予約 への送客）。 */
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  /** プロフィール要約（自己紹介の先頭抜粋）。 */
  bio: string;
  categories: { slug: string; label: string }[];
  /** 著者の公開記事一覧。 */
  posts: BlogCardView[];
}

/**
 * 著者（占い師=著者）アーカイブ (AC-C4-3). 公開占い師のプロフィール要約 + その占い師の
 * 公開記事一覧（compute-on-read, ADR-1 統一）。未公開 / 不在の占い師は null（→404）。
 * 著者ページは「占い師著者」が対象（運営投稿は対象外）。
 */
export async function getAuthorArchive(
  slug: string
): Promise<AuthorArchiveView | null> {
  const advisor = await db.fortuneTellerProfile.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      bio: true,
      photoUrl: true,
      user: { select: { displayName: true, avatarUrl: true } },
      categories: {
        orderBy: { isPrimary: "desc" },
        select: { category: { select: { slug: true, name: true } } },
      },
    },
  });
  if (!advisor) return null;

  const rows = await db.blogPost.findMany({
    where: {
      AND: [publishedPostWhere(), { advisorProfile: { slug } }],
    },
    orderBy: { publishedAt: "desc" },
    select: BLOG_CARD_SELECT,
  });

  return {
    slug: advisor.slug,
    displayName: advisor.user.displayName,
    avatarUrl: advisor.photoUrl ?? advisor.user.avatarUrl ?? null,
    bio: advisor.bio,
    categories: advisor.categories.map((c) => ({
      slug: c.category.slug,
      label: c.category.name,
    })),
    posts: rows
      .filter((p): p is BlogCardRow & { publishedAt: Date } => p.publishedAt != null)
      .map(toBlogCard),
  };
}

export interface AdminUserView {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

/** 運営: ユーザー一覧（isActive トグル対象）。PII（email）は ADMIN のみが見る画面。 */
export async function getAdminUsers(limit = 100): Promise<AdminUserView[]> {
  const rows = await db.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
  return rows;
}

export interface AdminAdvisorView {
  id: string;
  slug: string;
  displayName: string;
  isPublished: boolean;
  userIsActive: boolean;
  serviceCount: number;
  requestCount: number;
}

/** 運営: 占い師一覧（公開状態 + 集計）。 */
export async function getAdminAdvisors(limit = 100): Promise<AdminAdvisorView[]> {
  const rows = await db.fortuneTellerProfile.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      isPublished: true,
      user: { select: { displayName: true, isActive: true } },
      _count: { select: { services: true, consultationRequests: true } },
    },
  });
  return rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    displayName: a.user.displayName,
    isPublished: a.isPublished,
    userIsActive: a.user.isActive,
    serviceCount: a._count.services,
    requestCount: a._count.consultationRequests,
  }));
}

export interface AdminServiceView {
  id: string;
  title: string;
  method: ConsultationMethod;
  priceJpy: number;
  durationMin: number;
  isPublished: boolean;
  advisor: { slug: string; displayName: string };
  category: { slug: string; label: string };
}

/** 運営: サービス一覧（全件, 公開状態表示）。 */
export async function getAdminServices(limit = 200): Promise<AdminServiceView[]> {
  const rows = await db.service.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      method: true,
      priceJpy: true,
      durationMin: true,
      isPublished: true,
      advisor: {
        select: { slug: true, user: { select: { displayName: true } } },
      },
      category: { select: { slug: true, name: true } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    method: s.method,
    priceJpy: s.priceJpy,
    durationMin: s.durationMin,
    isPublished: s.isPublished,
    advisor: { slug: s.advisor.slug, displayName: s.advisor.user.displayName },
    category: { slug: s.category.slug, label: s.category.name },
  }));
}

// ===========================================================================
// Wave 5b — 記事の管理（占い師 / 運営）・編集・プレビュー・ブログ管理
//           spec §3 RBAC / §4.2 / §5.2; SEC-3 所有権。
//
// 注意: 公開判定（compute-on-read）は W5a の publishedPostWhere() を再利用する。
//       本セクションは「管理者/著者が自分の/全記事を見る」読み側で、公開述語を
//       かけない（draft/scheduled/archived を含む）。それゆえ呼び出し側が必ず
//       RBAC + 所有権を強制すること（page / action 側で検証済みの id を渡す）。
// ===========================================================================

/** 著者の記事一覧 1 行（管理 UI 用。本文は含めない＝一覧軽量化）。 */
export interface ManagedPostRow {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  category: { slug: string; label: string };
  /** 占い師著者なら slug、運営投稿なら null。 */
  authorAdvisorSlug: string | null;
  authorDisplayName: string;
}

const MANAGED_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  status: true,
  publishedAt: true,
  updatedAt: true,
  category: { select: { slug: true, name: true } },
  advisorProfile: { select: { slug: true } },
  author: { select: { displayName: true } },
} satisfies Prisma.BlogPostSelect;

type ManagedPostRowDb = Prisma.BlogPostGetPayload<{
  select: typeof MANAGED_POST_SELECT;
}>;

function toManagedPostRow(p: ManagedPostRowDb): ManagedPostRow {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    category: { slug: p.category.slug, label: p.category.name },
    authorAdvisorSlug: p.advisorProfile?.slug ?? null,
    authorDisplayName: p.author.displayName,
  };
}

/**
 * 占い師の自記事一覧（AC-B9-4, C-2）. advisorProfileId は呼び出し側で解決済みの
 * 自分の profile.id（SEC-3）。draft/scheduled/published/archived すべてを status
 * 降順 + 更新降順で返す（管理 UI でステータス別にグルーピングするため）。
 */
export async function getAdvisorOwnPosts(
  advisorProfileId: string
): Promise<ManagedPostRow[]> {
  const rows = await db.blogPost.findMany({
    where: { advisorProfileId },
    orderBy: [{ updatedAt: "desc" }],
    select: MANAGED_POST_SELECT,
  });
  return rows.map(toManagedPostRow);
}

/** 編集フォームへ渡す記事の全フィールド（contentJson を含む）。 */
export interface EditablePost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Tiptap doc JSON（エディタ初期値）。 */
  contentJson: unknown;
  thumbnailUrl: string | null;
  status: PostStatus;
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  categoryId: string;
  tagSlugs: string[];
  /** 所有権検証用: 著者 User.id と 占い師 profile.id。 */
  authorId: string;
  advisorProfileId: string | null;
}

const EDITABLE_POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  contentJson: true,
  thumbnailUrl: true,
  status: true,
  publishedAt: true,
  seoTitle: true,
  seoDescription: true,
  ogImageUrl: true,
  categoryId: true,
  authorId: true,
  advisorProfileId: true,
  tags: { select: { tag: { select: { slug: true } } } },
} satisfies Prisma.BlogPostSelect;

function toEditablePost(
  p: Prisma.BlogPostGetPayload<{ select: typeof EDITABLE_POST_SELECT }>
): EditablePost {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    contentJson: p.contentJson,
    thumbnailUrl: p.thumbnailUrl,
    status: p.status,
    publishedAt: p.publishedAt,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImageUrl: p.ogImageUrl,
    categoryId: p.categoryId,
    tagSlugs: p.tags.map((t) => t.tag.slug),
    authorId: p.authorId,
    advisorProfileId: p.advisorProfileId,
  };
}

/**
 * 編集対象の記事を id で取得（所有権検証は呼び出し側）. 公開述語をかけないので
 * draft/scheduled/archived も取得できる。null は不在。
 */
export async function getEditablePost(id: string): Promise<EditablePost | null> {
  const p = await db.blogPost.findUnique({
    where: { id },
    select: EDITABLE_POST_SELECT,
  });
  return p ? toEditablePost(p) : null;
}

/** プレビュー用の記事ビュー（本人/運営限定で draft/scheduled を表示, contentHtml）。 */
export interface PostPreviewView {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** サニタイズ済 HTML（保存時に生成済み, SEC-5）。 */
  contentHtml: string;
  thumbnailUrl: string | null;
  status: PostStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  category: { slug: string; label: string };
  tags: { slug: string; label: string }[];
  author: {
    displayName: string;
    avatarUrl: string | null;
    advisorSlug: string | null;
  };
  /** 所有権検証用。 */
  authorId: string;
  advisorProfileId: string | null;
}

/**
 * プレビュー用に記事を取得（公開述語なし）。draft/scheduled/archived を含む。
 * 所有権 / RBAC（本人 or ADMIN）は呼び出し側で検証する。null は不在。
 */
export async function getPostForPreview(
  id: string
): Promise<PostPreviewView | null> {
  const p = await db.blogPost.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      contentHtml: true,
      thumbnailUrl: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      authorId: true,
      advisorProfileId: true,
      category: { select: { slug: true, name: true } },
      tags: {
        orderBy: { tag: { name: "asc" } },
        select: { tag: { select: { slug: true, name: true } } },
      },
      author: { select: { displayName: true, avatarUrl: true } },
      advisorProfile: { select: { slug: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    contentHtml: p.contentHtml,
    thumbnailUrl: p.thumbnailUrl,
    status: p.status,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    category: { slug: p.category.slug, label: p.category.name },
    tags: p.tags.map((t) => ({ slug: t.tag.slug, label: t.tag.name })),
    author: {
      displayName: p.author.displayName,
      avatarUrl: p.author.avatarUrl,
      advisorSlug: p.advisorProfile?.slug ?? null,
    },
    authorId: p.authorId,
    advisorProfileId: p.advisorProfileId,
  };
}

/** ブログのカテゴリ選択肢（記事フォーム用）。 */
export async function getBlogCategoriesForForm(): Promise<
  { id: string; slug: string; name: string }[]
> {
  return db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });
}

/** ブログのタグ選択肢（記事フォーム用）。 */
export async function getBlogTagsForForm(): Promise<
  { id: string; slug: string; name: string }[]
> {
  return db.blogTag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true },
  });
}

// ---------------------------------------------------------------------------
// Admin blog (運営): 全記事の status 一覧 / カテゴリ・タグ CRUD（AC-C3-1〜4）
// ---------------------------------------------------------------------------

/** 運営: 全記事一覧（全 status, 軽量行）。著者・カテゴリ・更新日を含む。 */
export async function getAdminPosts(limit = 200): Promise<ManagedPostRow[]> {
  const rows = await db.blogPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    select: MANAGED_POST_SELECT,
  });
  return rows.map(toManagedPostRow);
}

export interface AdminBlogStats {
  total: number;
  draft: number;
  scheduled: number;
  published: number;
  archived: number;
}

/** 運営: status 別の記事件数（実DB集計）。 */
export async function getAdminBlogStats(): Promise<AdminBlogStats> {
  const grouped = await db.blogPost.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus = new Map<PostStatus, number>(
    grouped.map((g) => [g.status, g._count._all])
  );
  const draft = byStatus.get("DRAFT") ?? 0;
  const scheduled = byStatus.get("SCHEDULED") ?? 0;
  const published = byStatus.get("PUBLISHED") ?? 0;
  const archived = byStatus.get("ARCHIVED") ?? 0;
  return {
    total: draft + scheduled + published + archived,
    draft,
    scheduled,
    published,
    archived,
  };
}

export interface AdminTaxonomyRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  postCount: number;
}

/** 運営: カテゴリ一覧（記事数つき, 全 status）。 */
export async function getAdminBlogCategories(): Promise<AdminTaxonomyRow[]> {
  const rows = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      _count: { select: { posts: true } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    postCount: c._count.posts,
  }));
}

/** 運営: タグ一覧（記事数つき, 全 status）。 */
export async function getAdminBlogTags(): Promise<AdminTaxonomyRow[]> {
  const rows = await db.blogTag.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { posts: true } },
    },
  });
  return rows.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: null,
    postCount: t._count.posts,
  }));
}

// ===========================================================================
// Wave 6 — sitemap.xml の動的生成用 read 群（SEO-13）
//
// 公開判定は W5a の publishedPostWhere() を再利用（二重定義禁止, ADR-1）。
// sitemap は <loc> + <lastmod> しか要らないので、ここでは一覧/詳細の重い select を
// 使わず、URL を組み立てるのに必要な最小フィールド（slug + 更新日時）だけを引く。
// すべて「公開集合」に限定する（占い師 isPublished / 記事 publishedPostWhere）。
// ===========================================================================

export interface SitemapEntry {
  /** site-relative path（sitemap 側で absoluteUrl() に通す）。 */
  path: string;
  /** <lastmod>。null の場合 sitemap 側で省略する。 */
  lastModified: Date | null;
}

/** 公開占い師の /advisors/[slug]（lastmod = profile.updatedAt）。 */
export async function getSitemapAdvisors(): Promise<SitemapEntry[]> {
  const rows = await db.fortuneTellerProfile.findMany({
    where: { isPublished: true },
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });
  return rows.map((a) => ({
    path: `/advisors/${a.slug}`,
    lastModified: a.updatedAt,
  }));
}

/**
 * 公開記事の /blog/[slug]（lastmod = updatedAt）。公開集合は publishedPostWhere()
 * 経由なので draft / archived / 未来 scheduled は構造的に含まれない（ADR-1, SEO-13）。
 */
export async function getSitemapPosts(): Promise<SitemapEntry[]> {
  const rows = await db.blogPost.findMany({
    where: publishedPostWhere(),
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });
  return rows.map((p) => ({
    path: `/blog/${p.slug}`,
    lastModified: p.updatedAt,
  }));
}

/**
 * 公開記事を持つブログカテゴリの /blog/category/[slug]。空カテゴリは除外
 * （getBlogCategoriesWithCounts と同じ「公開記事 > 0」基準）。
 */
export async function getSitemapBlogCategories(): Promise<SitemapEntry[]> {
  const published = publishedPostWhere();
  const rows = await db.blogCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      _count: { select: { posts: { where: published } } },
    },
  });
  return rows
    .filter((c) => c._count.posts > 0)
    .map((c) => ({ path: `/blog/category/${c.slug}`, lastModified: null }));
}

/**
 * 公開記事を持つブログタグの /blog/tag/[slug]。空タグは除外
 * （getBlogTagsWithCounts と同じ基準）。
 */
export async function getSitemapBlogTags(): Promise<SitemapEntry[]> {
  const published = publishedPostWhere();
  const rows = await db.blogTag.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      _count: { select: { posts: { where: { post: published } } } },
    },
  });
  return rows
    .filter((t) => t._count.posts > 0)
    .map((t) => ({ path: `/blog/tag/${t.slug}`, lastModified: null }));
}

/**
 * 公開占い師が 1 人以上いる占術カテゴリの /advisors/categories/[slug]。
 * URL は lowercase slug（CategoryCard と同一規約; advisors/categories/[slug] が
 * parseCategorySlug で大文字 enum に戻す）。空カテゴリは除外。
 */
export async function getSitemapDivinationCategories(): Promise<SitemapEntry[]> {
  const rows = await db.divinationCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      _count: {
        select: { advisors: { where: { advisor: { isPublished: true } } } },
      },
    },
  });
  return rows
    .filter((c) => c._count.advisors > 0)
    .map((c) => ({
      path: `/advisors/categories/${c.slug.toLowerCase()}`,
      lastModified: null,
    }));
}

/**
 * 著者アーカイブ /authors/[slug]。記事を 1 本以上持つ公開占い師のみ
 * （getAuthorArchive が著者=占い師に限定しているのと整合）。lastmod は省略。
 */
export async function getSitemapAuthors(): Promise<SitemapEntry[]> {
  const rows = await db.fortuneTellerProfile.findMany({
    where: {
      isPublished: true,
      blogPosts: { some: publishedPostWhere() },
    },
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true },
  });
  return rows.map((a) => ({
    path: `/authors/${a.slug}`,
    lastModified: a.updatedAt,
  }));
}
