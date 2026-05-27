import type { Metadata } from "next";
import Link from "next/link";
import {
  Inbox,
  Clock,
  CalendarClock,
  Settings2,
  PencilLine,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import {
  getOwnedAdvisorProfileId,
  getAdvisorDashboardStats,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "占い師ダッシュボード",
  robots: { index: false, follow: false },
};

/**
 * /advisor — 占い師ダッシュボード（spec §3: FORTUNE_TELLER, ADMIN も可）.
 *
 * RBAC は requireAdvisor で強制（SEC-2）。集計はすべて自分の profile.id 起点の
 * 実DB COUNT（ハードコードなし）。プロフィール未作成（登録途中）の占い師には
 * 登録完了導線を出す。
 */
export default async function AdvisorDashboardPage() {
  const user = await requireAdvisor("/advisor");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);

  // 占い師プロフィール未作成（ADMIN が profile を持たない / 登録途中）。
  if (!advisorProfileId) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <header>
          <h1 className="font-heading text-h1 font-bold text-primary">
            占い師ダッシュボード
          </h1>
        </header>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-rose-pale bg-brand-rose-pale/40 p-6">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal-strong"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-primary">
              占い師プロフィールがまだ作成されていません。
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {user.role === "ADMIN"
                ? "運営アカウントには占い師プロフィールがありません。占い師管理は「管理」画面から行えます。"
                : "占い師登録を完了すると、予約リクエストの受信やサービス管理ができるようになります。"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {user.role === "ADMIN" ? (
                <Button asChild variant="navy">
                  <Link href="/admin">管理画面へ</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/register/advisor">占い師登録を完了する</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = await getAdvisorDashboardStats(advisorProfileId);

  const metrics = [
    {
      label: "受信リクエスト",
      value: stats.totalRequests,
      icon: Inbox,
      hint: `${stats.totalRequests} 件`,
    },
    {
      label: "未対応",
      value: stats.pendingRequests,
      icon: Clock,
      hint: "要対応",
      emphasize: stats.pendingRequests > 0,
    },
    {
      label: "日程調整中",
      value: stats.rescheduledRequests,
      icon: CalendarClock,
      hint: "調整中",
    },
    {
      label: "公開サービス",
      value: stats.publishedServices,
      icon: Sparkles,
      hint: `全 ${stats.totalServices} 件中`,
    },
    {
      label: "公開記事",
      value: stats.publishedPosts,
      icon: PencilLine,
      hint: "公開中",
    },
  ];

  const navCards = [
    {
      href: "/advisor/requests",
      title: "予約リクエスト管理",
      description: "受信した相談リクエストの承認・日程調整・辞退を行います。",
      icon: Inbox,
    },
    {
      href: "/advisor/services",
      title: "サービス管理",
      description: "鑑定メニューの登録・編集・公開/非公開の切り替えを行います。",
      icon: Settings2,
    },
    {
      href: "/advisor/posts",
      title: "記事管理",
      description: "コラム記事の執筆・下書き・公開・予約投稿を管理します。",
      icon: PencilLine,
    },
    {
      href: "/advisor/profile",
      title: "プロフィール管理",
      description: "自己紹介・得意占術・対応形式・公開状態を編集します。",
      icon: Settings2,
    },
  ];

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-h1 font-bold text-primary">
            占い師ダッシュボード
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            {user.displayName} さん、こんにちは。受信状況とメニューを管理できます。
          </p>
        </div>
        <Badge variant={stats.isPublished ? "success" : "warning"}>
          {stats.isPublished ? "プロフィール公開中" : "プロフィール非公開"}
        </Badge>
      </header>

      {/* 概要メトリクス（実DB集計） */}
      <section aria-labelledby="metrics-heading" className="mt-10">
        <h2 id="metrics-heading" className="sr-only">
          概要
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base"
              >
                <dt className="flex items-center gap-2 text-sm text-gray-500">
                  <Icon
                    className="h-4 w-4 text-brand-teal-strong"
                    aria-hidden="true"
                  />
                  {m.label}
                </dt>
                <dd className="mt-2 flex items-baseline gap-2">
                  <span
                    className={
                      "font-heading text-h2 font-bold tabular-nums " +
                      (m.emphasize ? "text-brand-teal-strong" : "text-primary")
                    }
                  >
                    {m.value}
                  </span>
                  <span className="text-xs text-gray-400">{m.hint}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* 各管理へのナビ */}
      <section aria-labelledby="nav-heading" className="mt-12">
        <h2
          id="nav-heading"
          className="font-heading text-h3 font-semibold text-primary"
        >
          管理メニュー
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {navCards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-card p-6 shadow-base transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-rose-pale"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5 text-brand-teal-strong" />
                </span>
                <span className="mt-4 font-heading text-h4 font-semibold text-primary">
                  {c.title}
                </span>
                <span className="mt-1 flex-1 text-sm text-gray-500">
                  {c.description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal-strong">
                  開く
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
