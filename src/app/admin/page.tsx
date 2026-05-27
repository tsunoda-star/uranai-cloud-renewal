import type { Metadata } from "next";
import Link from "next/link";
import { Users, Sparkles, Settings2, Inbox, FileText } from "lucide-react";

import { requireAdmin } from "@/lib/auth/rbac";
import {
  getAdminStats,
  getAdminUsers,
  getAdminAdvisors,
  getAdminServices,
} from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { AdminAdvisorTable } from "@/components/admin/admin-advisor-table";
import { AdminServiceTable } from "@/components/admin/admin-service-table";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "運営管理",
  robots: { index: false, follow: false },
};

/**
 * /admin — 最小運営ダッシュボード（spec §3: ADMIN のみ）.
 *
 * RBAC は requireAdmin で強制（SEC-2）。概要 + 占い師/ユーザー一覧（isActive トグル）+
 * サービス一覧。ブログ管理（カテゴリ/タグ/公開承認/archive）は W5（本画面では扱わない）。
 */
export default async function AdminPage() {
  const admin = await requireAdmin("/admin");

  const [stats, users, advisors, services] = await Promise.all([
    getAdminStats(),
    getAdminUsers(),
    getAdminAdvisors(),
    getAdminServices(),
  ]);

  const metrics = [
    { label: "ユーザー", value: stats.userCount, icon: Users },
    {
      label: "占い師",
      value: stats.advisorCount,
      icon: Sparkles,
      hint: `公開 ${stats.publishedAdvisorCount}`,
    },
    { label: "サービス", value: stats.serviceCount, icon: Settings2 },
    { label: "予約リクエスト", value: stats.requestCount, icon: Inbox },
    { label: "記事", value: stats.postCount, icon: FileText },
  ];

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-h1 font-bold text-primary">
            運営管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            {admin.displayName} さん、こんにちは。ユーザー・占い師・サービスを管理できます。
          </p>
        </div>
        <Link
          href="/admin/blog"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-3 text-sm font-medium text-brand-teal-strong hover:bg-brand-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          ブログ管理
        </Link>
      </header>

      {/* 概要メトリクス */}
      <section aria-labelledby="admin-metrics" className="mt-10">
        <h2 id="admin-metrics" className="sr-only">
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
                  <span className="font-heading text-h2 font-bold tabular-nums text-primary">
                    {m.value}
                  </span>
                  {m.hint && (
                    <span className="text-xs text-gray-400">{m.hint}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* 占い師一覧 */}
      <section aria-labelledby="admin-advisors" className="mt-12">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-5 w-5 text-brand-teal-strong"
            aria-hidden="true"
          />
          <h2
            id="admin-advisors"
            className="font-heading text-h3 font-semibold text-primary"
          >
            占い師一覧
          </h2>
          <Badge variant="secondary">{advisors.length}</Badge>
        </div>
        <div className="mt-5">
          <AdminAdvisorTable advisors={advisors} />
        </div>
      </section>

      {/* ユーザー一覧 */}
      <section aria-labelledby="admin-users" className="mt-12">
        <div className="flex items-center gap-2">
          <Users
            className="h-5 w-5 text-brand-teal-strong"
            aria-hidden="true"
          />
          <h2
            id="admin-users"
            className="font-heading text-h3 font-semibold text-primary"
          >
            ユーザー一覧
          </h2>
          <Badge variant="secondary">{users.length}</Badge>
        </div>
        <div className="mt-5">
          <AdminUserTable users={users} currentUserId={admin.id} />
        </div>
      </section>

      {/* サービス一覧 */}
      <section aria-labelledby="admin-services" className="mt-12">
        <div className="flex items-center gap-2">
          <Settings2
            className="h-5 w-5 text-brand-teal-strong"
            aria-hidden="true"
          />
          <h2
            id="admin-services"
            className="font-heading text-h3 font-semibold text-primary"
          >
            サービス一覧
          </h2>
          <Badge variant="secondary">{services.length}</Badge>
        </div>
        <div className="mt-5">
          <AdminServiceTable services={services} />
        </div>
      </section>
    </div>
  );
}
