import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Star, CalendarHeart, Award, BookOpen } from "lucide-react";

import {
  getAdvisorDetail,
  getAdvisorSeo,
  isAdvisorFavorited,
  type ServiceCardView,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/home/service-card";
import { FavoriteButton } from "@/components/catalog/favorite-button";
import { METHOD_META } from "@/lib/divination";
import {
  formatInt,
  formatRating,
  formatPublishedDate,
  toIsoDate,
} from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import {
  advisorPersonJsonLd,
  breadcrumbJsonLd,
  jsonLdString,
} from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const advisor = await getAdvisorSeo(slug);
  if (!advisor) return { title: "占い師が見つかりません" };

  const title = `${advisor.displayName} のプロフィール`;
  const description = advisor.bio.slice(0, 120);
  const url = absoluteUrl(`/advisors/${advisor.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${advisor.displayName} | 占いクラウド`,
      description,
      url,
      type: "profile",
      ...(advisor.photoUrl ? { images: [advisor.photoUrl] } : {}),
    },
  };
}

export default async function AdvisorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const advisor = await getAdvisorDetail(slug);
  if (!advisor) notFound();

  // お気に入りトグルは認証済み GENERAL のみ表示（RBAC, SEC-2）。
  // 表示判定はサーバー側で行い、アクション側でも再検証する（多層防御）。
  const user = await getCurrentUser();
  const canFavorite = user?.role === "GENERAL";
  const initialFavorited = canFavorite
    ? await isAdvisorFavorited(user.id, slug)
    : false;

  const bookingHref = `/booking/new?advisor=${encodeURIComponent(slug)}`;
  const loginHref = `/login?returnTo=${encodeURIComponent(
    `/advisors/${slug}`
  )}`;

  // ServiceCardView へ整形して既存 ServiceCard を再利用（占い師は当該プロフィール）。
  const serviceCards: ServiceCardView[] = advisor.services.map((s) => ({
    id: s.id,
    title: s.title,
    method: s.method,
    priceJpy: s.priceJpy,
    durationMin: s.durationMin,
    category: s.category,
    advisor: {
      slug: advisor.slug,
      displayName: advisor.displayName,
      avatarUrl: advisor.avatarUrl,
    },
  }));

  const personLd = advisorPersonJsonLd({
    slug: advisor.slug,
    displayName: advisor.displayName,
    bio: advisor.bio,
    photoUrl: advisor.avatarUrl,
    rating: advisor.rating,
    categories: advisor.categories,
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "占い師を探す", path: "/advisors" },
    { name: advisor.displayName, path: `/advisors/${advisor.slug}` },
  ]);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }}
      />

      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/advisors"
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              占い師を探す
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-primary" aria-current="page">
            {advisor.displayName}
          </li>
        </ol>
      </nav>

      {/* Profile header */}
      <header className="mt-6 flex flex-col gap-6 rounded-2xl border border-gray-200 bg-card p-6 shadow-base sm:flex-row sm:items-start sm:p-8">
        <Avatar
          name={advisor.displayName}
          src={advisor.avatarUrl}
          alt={`${advisor.displayName}のプロフィール写真`}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-balance font-heading text-h1 font-bold text-primary">
            {advisor.displayName}
          </h1>

          {advisor.rating && (
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Star
                className="h-5 w-5 fill-brand-gold text-brand-gold"
                aria-hidden="true"
              />
              <span className="font-semibold tabular-nums text-primary">
                {formatRating(advisor.rating.average)}
              </span>
              <span className="text-gray-500">
                （{formatInt(advisor.rating.count)}件の評価）
              </span>
            </p>
          )}

          {advisor.categories.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {advisor.categories.map((c) => (
                <li key={c.slug}>
                  <Badge variant={c.isPrimary ? "accent" : "secondary"}>
                    {c.label}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {advisor.methods.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {advisor.methods.map((m) => {
                const meta = METHOD_META[m];
                const Icon = meta.icon;
                return (
                  <li
                    key={m}
                    className="flex items-center gap-1 text-sm text-gray-500"
                  >
                    <Icon
                      className="h-4 w-4 text-brand-teal-strong"
                      aria-hidden="true"
                    />
                    {meta.label}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="font-semibold">
              <Link href={bookingHref}>
                <CalendarHeart className="h-5 w-5" aria-hidden="true" />
                予約をリクエストする
              </Link>
            </Button>
            {canFavorite ? (
              <FavoriteButton
                advisorSlug={slug}
                initialFavorited={initialFavorited}
              />
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link href={loginHref}>ログインしてお気に入り</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {/* Bio */}
          <section>
            <h2 className="font-heading text-h3 font-semibold text-primary">
              自己紹介
            </h2>
            <p className="mt-3 whitespace-pre-line text-balance text-body leading-relaxed text-gray-600">
              {advisor.bio}
            </p>
          </section>

          {/* Services */}
          <section className="mt-12">
            <h2 className="font-heading text-h3 font-semibold text-primary">
              提供している鑑定メニュー
            </h2>
            {serviceCards.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                現在公開中の鑑定メニューはありません。
              </p>
            ) : (
              <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {serviceCards.map((service) => (
                  <li key={service.id}>
                    <ServiceCard service={service} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Advisor's own blog posts */}
          {advisor.posts.length > 0 && (
            <section className="mt-12">
              <h2 className="font-heading text-h3 font-semibold text-primary">
                {advisor.displayName} のコラム
              </h2>
              <ul className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-card shadow-base">
                {advisor.posts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-start gap-4 p-5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-base bg-brand-rose-pale"
                        aria-hidden="true"
                      >
                        <BookOpen className="h-5 w-5 text-brand-teal-strong" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-h4 font-semibold text-primary group-hover:underline">
                          {post.title}
                        </span>
                        {post.excerpt && (
                          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-gray-500">
                            {post.excerpt}
                          </span>
                        )}
                        <time
                          dateTime={toIsoDate(post.publishedAt)}
                          className="mt-1.5 block text-xs tabular-nums text-gray-400"
                        >
                          {formatPublishedDate(post.publishedAt)}
                        </time>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Reviews */}
          <section className="mt-12">
            <h2 className="font-heading text-h3 font-semibold text-primary">
              口コミ・評価
            </h2>
            {advisor.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                まだ口コミはありません。
              </p>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {advisor.reviews.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className="flex items-center gap-1"
                        aria-label={`評価 ${review.rating} / 5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={
                              i < review.rating
                                ? "h-4 w-4 fill-brand-gold text-brand-gold"
                                : "h-4 w-4 text-gray-300"
                            }
                            aria-hidden="true"
                          />
                        ))}
                        <span className="ml-1 text-sm font-semibold tabular-nums text-primary">
                          {formatRating(review.rating)}
                        </span>
                      </p>
                      <time
                        dateTime={toIsoDate(review.createdAt)}
                        className="text-xs tabular-nums text-gray-400"
                      >
                        {formatPublishedDate(review.createdAt)}
                      </time>
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-balance text-sm leading-relaxed text-gray-600">
                        {review.comment}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-gray-500">
                      {review.authorName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side rail: experience + booking */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {advisor.experience && (
            <div className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base">
              <h2 className="flex items-center gap-2 font-heading text-h4 font-semibold text-primary">
                <Award
                  className="h-5 w-5 text-brand-teal-strong"
                  aria-hidden="true"
                />
                活動実績
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {advisor.experience}
              </p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-card p-6 shadow-base">
            <p className="text-sm text-gray-600">
              {advisor.displayName} へ日程や相談形式を打診できます。決済・実鑑定は次フェーズで提供予定です。
            </p>
            <Button asChild size="lg" className="mt-4 w-full font-semibold">
              <Link href={bookingHref}>
                <CalendarHeart className="h-5 w-5" aria-hidden="true" />
                予約をリクエストする
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
