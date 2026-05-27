import Link from "next/link";

import { categoryIcon } from "@/lib/divination";
import { formatInt } from "@/lib/format";
import type { CategoryView } from "@/lib/queries";

/**
 * CategoryCard — a single divination category tile.
 * Whole card is the link (aria-label="{name}の占い師を探す"); icon is decorative.
 * Hover lifts -2px and deepens the shadow (base->md) over 200ms.
 * Target: /advisors/categories/{slug} (lowercased enum slug).
 */
export function CategoryCard({ category }: { category: CategoryView }) {
  const Icon = categoryIcon(category.iconKey);
  return (
    <Link
      href={`/advisors/categories/${category.slug.toLowerCase()}`}
      aria-label={`${category.name}の占い師を探す`}
      className="group flex h-full min-h-11 flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-card p-5 shadow-base transition-[transform,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-rose-pale transition-colors duration-200 group-hover:bg-brand-teal/15"
        aria-hidden="true"
      >
        <Icon className="h-6 w-6 text-brand-teal-strong" />
      </span>
      <div>
        <h3 className="font-heading text-h4 font-semibold text-primary">
          {category.name}
        </h3>
        {category.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {category.description}
          </p>
        )}
      </div>
      <p className="mt-auto pt-1 text-sm text-gray-500">
        <span className="tabular-nums font-medium text-primary">
          {formatInt(category.advisorCount)}
        </span>
        名の占い師
      </p>
    </Link>
  );
}
