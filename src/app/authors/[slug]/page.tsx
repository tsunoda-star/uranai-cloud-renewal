import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, CalendarHeart, Sparkles, BookOpen } from "lucide-react";

import { getAuthorArchive } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/components/home/blog-card";
import { formatInt } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdString } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorArchive(slug);
  if (!author) return { title: "著者が見つかりません" };

  const title = `${author.displayName} のコラム一覧`;
  const description = `占い師 ${author.displayName} が執筆したコラムの一覧。${author.bio.slice(
    0,
    80
  )}`;
  const url = absoluteUrl(`/authors/${author.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | 占いクラウド`,
      description,
      url,
      type: "profile",
      ...(author.avatarUrl ? { images: [author.avatarUrl] } : {}),
    },
  };
}

export default async function AuthorArchivePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthorArchive(slug);
  if (!author) notFound();

  const advisorHref = `/advisors/${author.slug}`;
  const bookingHref = `/booking/new?advisor=${encodeURIComponent(author.slug)}`;

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "コラム", path: "/blog" },
    { name: author.displayName, path: `/authors/${author.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
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
          <li className="font-medium text-primary" aria-current="page">
            {author.displayName}
          </li>
        </ol>
      </nav>

      {/* Author profile summary + consultation CTA */}
      <header className="mt-6 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-card p-6 shadow-base sm:flex-row sm:items-start sm:p-8">
        <Avatar
          name={author.displayName}
          src={author.avatarUrl}
          alt={`${author.displayName}のプロフィール写真`}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
            Author
          </p>
          <h1 className="mt-1 text-balance font-heading text-h1 font-bold text-primary">
            {author.displayName} のコラム
          </h1>

          {author.categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {author.categories.map((c) => (
                <li key={c.slug}>
                  <Badge variant="secondary">{c.label}</Badge>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 line-clamp-3 text-balance text-body leading-relaxed text-gray-600">
            {author.bio}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
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
        </div>
      </header>

      {/* Author's published posts */}
      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-h3 font-semibold text-primary">
            公開中のコラム
          </h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold tabular-nums text-primary">
              {formatInt(author.posts.length)}
            </span>
            件
          </p>
        </div>

        {author.posts.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-card px-6 py-16 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-rose-pale"
              aria-hidden="true"
            >
              <BookOpen className="h-7 w-7 text-brand-teal-strong" />
            </span>
            <p className="mt-5 text-sm text-gray-500">
              現在公開中のコラムはありません。
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {author.posts.map((post) => (
              <li key={post.slug}>
                <BlogCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
