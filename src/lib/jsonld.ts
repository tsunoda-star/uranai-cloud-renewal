/**
 * JSON-LD (schema.org) builders for the public catalog surfaces (SEO-1/5/9).
 *
 * Every URL is absolutized via `absoluteUrl` (NEXT_PUBLIC_SITE_URL, OPEN-1).
 * Builders only ever receive non-sensitive, already-public profile/service
 * fields — never 要配慮情報 (相談概要/レビュー本文は構造化データに含めない, §12).
 */
import { absoluteUrl } from "@/lib/site";

/** A single breadcrumb hop. `path` is site-relative; it is absolutized here. */
export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Organization JSON-LD for the site (SEO-11). Emitted on the homepage. Only
 * non-sensitive, stable site identity fields. `logo` is omitted unless a real
 * asset URL is supplied (no placeholder — SEO-8 / mock-free).
 */
export function organizationJsonLd(org: {
  name: string;
  description: string;
  logoUrl?: string | null;
}): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    description: org.description,
    url: absoluteUrl("/"),
  };
  if (org.logoUrl) node.logo = org.logoUrl;
  return node;
}

/**
 * WebSite JSON-LD with a SearchAction (SEO-11) so search engines can render a
 * sitelinks searchbox pointing at the advisor catalog (/advisors?q=...). The
 * `{search_term_string}` token is the schema.org-standard query placeholder and
 * is intentionally left literal (it is not a mock value).
 */
export function websiteJsonLd(site: {
  name: string;
  description: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    description: site.description,
    url: absoluteUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/advisors")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** BreadcrumbList JSON-LD (shared by advisor / service detail pages). */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Person JSON-LD for an advisor profile (AC-B4 SEO). */
export function advisorPersonJsonLd(advisor: {
  slug: string;
  displayName: string;
  bio: string;
  photoUrl: string | null;
  rating: { average: number; count: number } | null;
  categories: { label: string }[];
}): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: advisor.displayName,
    description: advisor.bio,
    url: absoluteUrl(`/advisors/${advisor.slug}`),
    jobTitle: "占い師",
    knowsAbout: advisor.categories.map((c) => c.label),
  };
  if (advisor.photoUrl) node.image = advisor.photoUrl;
  if (advisor.rating && advisor.rating.count > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: advisor.rating.average,
      reviewCount: advisor.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return node;
}

/** Service JSON-LD for a consultation menu (AC-B5 SEO). */
export function serviceJsonLd(service: {
  id: string;
  title: string;
  description: string;
  priceJpy: number;
  category: { label: string };
  advisor: { slug: string; displayName: string };
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    serviceType: service.category.label,
    url: absoluteUrl(`/services/${service.id}`),
    provider: {
      "@type": "Person",
      name: service.advisor.displayName,
      url: absoluteUrl(`/advisors/${service.advisor.slug}`),
    },
    offers: {
      "@type": "Offer",
      price: service.priceJpy,
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/services/${service.id}`),
    },
  };
}

/**
 * Article JSON-LD for a blog post detail page (AC-C1-3/7 SEO, schema.org/Article).
 * `image` accepts ogImageUrl || thumbnailUrl (caller resolves the precedence).
 * Author is a Person; when the author is an advisor the canonical /advisors/[slug]
 * URL is attached so the article links back into the catalog (C-4).
 */
export function articleJsonLd(post: {
  slug: string;
  title: string;
  description: string;
  image: string | null;
  datePublished: Date;
  dateModified: Date;
  author: { displayName: string; advisorSlug: string | null };
}): Record<string, unknown> {
  const authorNode: Record<string, unknown> = {
    "@type": "Person",
    name: post.author.displayName,
  };
  if (post.author.advisorSlug) {
    authorNode.url = absoluteUrl(`/advisors/${post.author.advisorSlug}`);
  }
  const url = absoluteUrl(`/blog/${post.slug}`);
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: post.datePublished.toISOString(),
    dateModified: post.dateModified.toISOString(),
    author: authorNode,
    publisher: {
      "@type": "Organization",
      name: "占いクラウド",
      url: absoluteUrl("/"),
    },
  };
  if (post.image) node.image = post.image;
  return node;
}

/**
 * Serialize a JSON-LD object for an inline `<script type="application/ld+json">`.
 * `<` is escaped to `<` to keep the payload safe inside the script tag.
 */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
