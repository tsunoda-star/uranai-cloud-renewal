import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, Info, CalendarHeart } from "lucide-react";

import { getServiceDetail } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { METHOD_META } from "@/lib/divination";
import { formatInt, formatJpy } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import {
  breadcrumbJsonLd,
  serviceJsonLd,
  jsonLdString,
} from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = await getServiceDetail(id);
  if (!service) return { title: "鑑定メニューが見つかりません" };

  const title = service.title;
  const description = service.description.slice(0, 120);
  const url = absoluteUrl(`/services/${service.id}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | 占いクラウド`,
      description,
      url,
      type: "article",
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getServiceDetail(id);
  if (!service) notFound();

  const method = METHOD_META[service.method];
  const MethodIcon = method.icon;
  const bookingHref = `/booking/new?advisor=${encodeURIComponent(
    service.advisor.slug
  )}&service=${encodeURIComponent(service.id)}`;

  const serviceLd = serviceJsonLd(service);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "ホーム", path: "/" },
    { name: "鑑定を探す", path: "/services" },
    { name: service.title, path: `/services/${service.id}` },
  ]);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbLd) }}
      />

      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href="/services"
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              鑑定を探す
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-primary" aria-current="page">
            {service.title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="accent">
              <Link
                href={`/services?category=${service.category.slug.toLowerCase()}`}
                className="focus-visible:outline-none"
              >
                {service.category.label}
              </Link>
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <MethodIcon className="h-3 w-3" aria-hidden="true" />
              {method.label}
            </Badge>
          </div>

          <h1 className="mt-3 text-balance font-heading text-h1 font-bold text-primary">
            {service.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <p className="flex items-baseline gap-1">
              <span className="font-heading text-h3 font-bold tabular-nums text-primary">
                {formatJpy(service.priceJpy)}
              </span>
              <span className="font-semibold text-gray-500">円</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              所要時間
              <span className="tabular-nums">
                {formatInt(service.durationMin)}
              </span>
              分
            </p>
          </div>

          <section className="mt-8">
            <h2 className="font-heading text-h3 font-semibold text-primary">
              鑑定内容
            </h2>
            <p className="mt-3 whitespace-pre-line text-balance text-body leading-relaxed text-gray-600">
              {service.description}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="font-heading text-h3 font-semibold text-primary">
              提供占い師
            </h2>
            <div className="mt-3 flex items-start gap-4 rounded-2xl border border-gray-200 bg-card p-5 shadow-base">
              <Avatar
                name={service.advisor.displayName}
                src={service.advisor.avatarUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-h4 font-semibold text-primary">
                  <Link
                    href={`/advisors/${service.advisor.slug}`}
                    className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
                  >
                    {service.advisor.displayName}
                  </Link>
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">
                  {service.advisor.bio}
                </p>
                <Link
                  href={`/advisors/${service.advisor.slug}`}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-teal-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
                >
                  プロフィールを見る
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base">
            <p className="flex items-baseline gap-1">
              <span className="font-heading text-h2 font-bold tabular-nums text-primary">
                {formatJpy(service.priceJpy)}
              </span>
              <span className="font-semibold text-gray-500">円</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span className="tabular-nums">
                {formatInt(service.durationMin)}
              </span>
              分 / {method.label}
            </p>

            <Button asChild size="lg" className="mt-5 w-full font-semibold">
              <Link href={bookingHref}>
                <CalendarHeart className="h-5 w-5" aria-hidden="true" />
                このサービスを予約リクエスト
              </Link>
            </Button>

            <p className="mt-4 flex items-start gap-2 rounded-base bg-secondary px-3 py-2.5 text-xs leading-relaxed text-gray-600">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal-strong"
                aria-hidden="true"
              />
              決済・実際の鑑定は次フェーズで提供予定です。まずは占い師へ予約リクエスト（日程・相談形式の打診）を送れます。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
