import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPublishedDate, toIsoDate } from "@/lib/format";
import type { BlogCardView } from "@/lib/queries";

/**
 * BlogCard — published article tile.
 * 16:9 thumbnail (placeholder = pale band + icon when no image), category Badge,
 * title (line-clamp 2), excerpt (line-clamp 3), author avatar + name, <time> date.
 * Whole card links to /blog/{slug}; the author name links to /advisors/{slug}
 * when the author is an advisor (AC-C1-4 catalog integration).
 */
export function BlogCard({ post }: { post: BlogCardView }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base transition-[transform,box-shadow] duration-200 ease-snap hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden bg-brand-rose-pale">
        {post.thumbnailUrl ? (
          // Covers are LOCAL themed SVGs (public/blog/cover-*.svg) assigned per
          // article motif. Served same-origin, so a plain <img> is intentional.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center"
            aria-hidden="true"
          >
            <BookOpen className="h-10 w-10 text-brand-teal/50" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="accent">{post.category.label}</Badge>
          <time
            dateTime={toIsoDate(post.publishedAt)}
            className="text-xs tabular-nums text-gray-500"
          >
            {formatPublishedDate(post.publishedAt)}
          </time>
        </div>

        <h3 className="mt-3 line-clamp-2 font-heading text-h4 font-semibold text-primary">
          <Link
            href={`/blog/${post.slug}`}
            aria-label={`記事「${post.title}」を読む`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
          >
            {post.title}
          </Link>
        </h3>

        {post.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-500">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <Avatar name={post.author.displayName} src={post.author.avatarUrl} size="sm" />
          {post.author.slug ? (
            <Link
              href={`/advisors/${post.author.slug}`}
              className="relative z-10 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              {post.author.displayName}
            </Link>
          ) : (
            <span className="text-sm font-medium text-primary">
              {post.author.displayName}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
