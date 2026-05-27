import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import {
  getSitemapAdvisors,
  getSitemapAuthors,
  getSitemapBlogCategories,
  getSitemapBlogTags,
  getSitemapDivinationCategories,
  getSitemapPosts,
  type SitemapEntry,
} from "@/lib/queries";

/**
 * Dynamic sitemap.xml (SEO-13, spec §2).
 *
 * Includes the public marketing surfaces only:
 *   - static public pages (/ /advisors /services /blog /match …)
 *   - every published advisor (/advisors/[slug])
 *   - divination categories with ≥1 published advisor (/advisors/categories/[slug])
 *   - blog categories / tags that have ≥1 published post
 *   - every PUBLISHED blog post (/blog/[slug]) — the published set is defined by
 *     `publishedPostWhere()` (reused, ADR-1), so draft / archived / future-scheduled
 *     posts are structurally excluded.
 *   - author archives (/authors/[slug]) for fortune-teller authors with ≥1 post.
 *
 * Absolute URLs come from `absoluteUrl()` (NEXT_PUBLIC_SITE_URL, OPEN-1). Auth-gated
 * / admin / advisor-dashboard / mypage / dev / api paths are NEVER listed (they are
 * also Disallow-ed in robots.ts).
 */

// Always reflect current DB state (seed dataset / live publishes), never a build
// snapshot. Pairs with the per-route `force-dynamic` used across the public pages.
export const dynamic = "force-dynamic";

type StaticPage = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

/** Crawlable static public pages (no params). Order = descending importance. */
const STATIC_PAGES: StaticPage[] = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/advisors", changeFrequency: "daily", priority: 0.9 },
  { path: "/services", changeFrequency: "daily", priority: 0.8 },
  { path: "/match", changeFrequency: "weekly", priority: 0.7 },
  { path: "/blog", changeFrequency: "daily", priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [advisors, categories, posts, blogCategories, blogTags, authors] =
    await Promise.all([
      getSitemapAdvisors(),
      getSitemapDivinationCategories(),
      getSitemapPosts(),
      getSitemapBlogCategories(),
      getSitemapBlogTags(),
      getSitemapAuthors(),
    ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Detail / landing pages. Each kind shares a changefreq/priority profile.
  const dynamicEntries: MetadataRoute.Sitemap = [
    ...toEntries(advisors, "weekly", 0.8),
    ...toEntries(categories, "weekly", 0.6),
    ...toEntries(posts, "monthly", 0.7),
    ...toEntries(blogCategories, "weekly", 0.5),
    ...toEntries(blogTags, "monthly", 0.4),
    ...toEntries(authors, "weekly", 0.5),
  ];

  return [...staticEntries, ...dynamicEntries];
}

/** Map DB-derived SitemapEntry rows to MetadataRoute.Sitemap items. */
function toEntries(
  rows: SitemapEntry[],
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap {
  return rows.map((row) => {
    const entry: MetadataRoute.Sitemap[number] = {
      url: absoluteUrl(row.path),
      changeFrequency,
      priority,
    };
    if (row.lastModified) entry.lastModified = row.lastModified;
    return entry;
  });
}
