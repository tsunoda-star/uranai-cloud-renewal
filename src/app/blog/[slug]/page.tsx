import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, CalendarHeart, BookOpen, Sparkles } from "lucide-react";

import { getPostDetail, getRelatedPosts } from "@/lib/queries";
import { decodeSlugParam } from "@/lib/blog/slug-param";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/components/home/blog-card";
import { formatPublishedDate, toIsoDate } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  jsonLdString,
} from "@/lib/jsonld";

export const dynamic = "force-dynamic";

/** OGP/JSON-LD image precedence: 著者上書き ogImageUrl → サムネ thumbnailUrl. */
function resolveOgImage(post: {
  ogImageUrl: string | null;
  thumbnailUrl: string | null;
}): string | null {
  return post.ogImageUrl ?? post.thumbnailUrl ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const post = await getPostDetail(slug);
  if (!post) return { title: "記事が見つかりません" };

  // SEO 上書き（AC-C2-8）: seoTitle/seoDescription があれば優先、無ければ title/excerpt。
  const title = post.seoTitle ?? post.title;
  const description =
    post.seoDescription ?? post.excerpt ?? `${post.title} | 占いクラウドのコラム`;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = resolveOgImage(post);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | 占いクラウド`,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlugParam(rawSlug);
  const post = await getPostDetail(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.category.slug, post.slug, 3);

  const isAdvisorAuthor = post.author.advisorSlug != null;
  const advisorHref = post.author.advisorSlug
    ? `/advisors/${post.author.advisorSlug}`
    : null;
  const bookingHref = post.author.advisorSlug
    ? `/booking/new?advisor=${encodeURIComponent(post.author.advisorSlug)}`
    : null;

  const ogImage = resolveOgImage(post);

  const articleLd = articleJsonLd({
    slug: post.slug,
    title: post.title,
    description: post.seoDescription ?? post.excerpt ?? post.title,
    image: ogImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      displayName: post.author.displayName,
      advisorSlug: post.author.advisorSlug,
    },
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "コラム", path: "/blog" },
    { name: post.category.label, path: `/blog/category/${post.category.slug}` },
    { name: post.title, path: `/blog/${post.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }}
      />

      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/blog"
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              コラム
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li>
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              {post.category.label}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="line-clamp-1 font-medium text-primary" aria-current="page">
            {post.title}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/blog/category/${post.category.slug}`}>
                <Badge variant="accent">{post.category.label}</Badge>
              </Link>
              <time
                dateTime={toIsoDate(post.publishedAt)}
                className="text-sm tabular-nums text-gray-500"
              >
                {formatPublishedDate(post.publishedAt)}
              </time>
            </div>

            <h1 className="mt-4 text-balance font-heading text-h1 font-bold leading-tight text-primary">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-4 text-balance text-body-lg leading-relaxed text-gray-600">
                {post.excerpt}
              </p>
            )}

            {/* Author byline */}
            <div className="mt-6 flex items-center gap-3 border-y border-gray-200 py-4">
              <Avatar
                name={post.author.displayName}
                src={post.author.avatarUrl}
                size="md"
              />
              <div className="min-w-0">
                {advisorHref ? (
                  <Link
                    href={advisorHref}
                    className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
                  >
                    {post.author.displayName}
                  </Link>
                ) : (
                  <span className="font-medium text-primary">
                    {post.author.displayName}
                  </span>
                )}
                <p className="text-xs text-gray-500">
                  {isAdvisorAuthor ? "占い師" : "占いクラウド運営"}
                </p>
              </div>
            </div>
          </header>

          {/* Thumbnail / eyecatch */}
          {post.thumbnailUrl && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-brand-rose-pale">
              {/* Seed posts have no eyecatch; remote image domains land in a later
                  Wave, so a plain <img> is used intentionally here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Body — contentHtml is サニタイズ済 (SEC-5). Raw JSON is never trusted. */}
          <div
            className="prose mt-8 max-w-content"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 border-t border-gray-200 pt-6">
              <h2 className="text-sm font-semibold text-gray-600">タグ</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/blog/tag/${t.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-gray-200 bg-card px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      #{t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Advisor consultation CTA (C-4 送客) — only when the author is an advisor */}
          {isAdvisorAuthor && advisorHref && bookingHref && (
            <aside className="mt-10 rounded-2xl border border-brand-teal/40 bg-brand-rose-pale p-6 shadow-base">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Avatar
                  name={post.author.displayName}
                  src={post.author.avatarUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-h4 font-semibold text-primary">
                    この記事を書いた {post.author.displayName} に相談する
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    記事の内容をもっと深く聞いてみたい方は、プロフィールから相談をリクエストできます。
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild size="lg" className="font-semibold">
                  <Link href={bookingHref}>
                    <CalendarHeart className="h-5 w-5" aria-hidden="true" />
                    この占い師に相談する
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={advisorHref}>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    プロフィールを見る
                  </Link>
                </Button>
              </div>
            </aside>
          )}
        </article>

        {/* Side rail: related posts */}
        <aside className="lg:order-last">
          {related.length > 0 && (
            <div className="lg:sticky lg:top-24">
              <h2 className="flex items-center gap-2 font-heading text-h4 font-semibold text-primary">
                <BookOpen
                  className="h-5 w-5 text-brand-teal-strong"
                  aria-hidden="true"
                />
                関連する記事
              </h2>
              <ul className="mt-4 flex flex-col gap-5">
                {related.map((rp) => (
                  <li key={rp.slug}>
                    <BlogCard post={rp} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-12 max-w-content">
        <Link
          href={`/blog/category/${post.category.slug}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-teal-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
        >
          {post.category.label}の記事をもっと見る
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
