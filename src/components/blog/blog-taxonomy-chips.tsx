import Link from "next/link";
import { Folder, Tag } from "lucide-react";

import type { BlogCategoryChip, BlogTagChip } from "@/lib/queries";
import { formatInt } from "@/lib/format";

/**
 * Category / tag chip rails for the public blog (AC-C1: カテゴリ/タグ導線).
 * Server-rendered links (no JS). Each chip routes to /blog/category/[slug] or
 * /blog/tag/[slug]. `activeSlug` highlights the current taxonomy on its landing.
 */
export function BlogTaxonomyChips({
  categories,
  tags,
  activeCategorySlug,
  activeTagSlug,
}: {
  categories: BlogCategoryChip[];
  tags: BlogTagChip[];
  activeCategorySlug?: string;
  activeTagSlug?: string;
}) {
  if (categories.length === 0 && tags.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {categories.length > 0 && (
        <ChipGroup
          heading="カテゴリで探す"
          icon={<Folder className="h-4 w-4 text-brand-teal-strong" aria-hidden="true" />}
        >
          {categories.map((c) => (
            <Chip
              key={c.slug}
              href={`/blog/category/${c.slug}`}
              active={c.slug === activeCategorySlug}
              count={c.postCount}
            >
              {c.name}
            </Chip>
          ))}
        </ChipGroup>
      )}

      {tags.length > 0 && (
        <ChipGroup
          heading="タグで探す"
          icon={<Tag className="h-4 w-4 text-brand-teal-strong" aria-hidden="true" />}
        >
          {tags.map((t) => (
            <Chip
              key={t.slug}
              href={`/blog/tag/${t.slug}`}
              active={t.slug === activeTagSlug}
              count={t.postCount}
            >
              {t.name}
            </Chip>
          ))}
        </ChipGroup>
      )}
    </div>
  );
}

function ChipGroup({
  heading,
  icon,
  children,
}: {
  heading: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
        {icon}
        {heading}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">{children}</ul>
    </div>
  );
}

function Chip({
  href,
  active = false,
  count,
  children,
}: {
  href: string;
  active?: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={
          active
            ? "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand-teal bg-brand-rose-pale px-4 py-2 text-sm font-medium text-brand-teal-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            : "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gray-200 bg-card px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        }
      >
        {children}
        <span className="tabular-nums text-xs text-gray-400">
          {formatInt(count)}
        </span>
      </Link>
    </li>
  );
}
