import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft, Plus } from "lucide-react";

import { requireAdmin } from "@/lib/auth/rbac";
import {
  getAdminPosts,
  getAdminBlogStats,
  getAdminBlogCategories,
  getAdminBlogTags,
} from "@/lib/queries";
import { isApprovalRequired } from "@/lib/blog/post-status";
import { Button } from "@/components/ui/button";
import { AdminBlogManager } from "@/components/blog/admin-blog-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ブログ管理",
  robots: { index: false, follow: false },
};

/**
 * /admin/blog — 運営ブログ管理（AC-C3-1〜4, spec §3: ADMIN のみ）.
 * RBAC は requireAdmin で強制（SEC-2）。全記事 status 一覧/変更（承認公開・archive・
 * 差戻し）+ カテゴリ/タグ CRUD。新規記事は記事エディタ（/advisor/posts/new、ADMIN は
 * 運営記事として保存）を共有する。
 */
export default async function AdminBlogPage() {
  await requireAdmin("/admin/blog");

  const [stats, posts, categories, tags] = await Promise.all([
    getAdminBlogStats(),
    getAdminPosts(),
    getAdminBlogCategories(),
    getAdminBlogTags(),
  ]);

  const metrics = [
    { label: "総記事", value: stats.total },
    { label: "公開中", value: stats.published },
    { label: "予約投稿", value: stats.scheduled },
    { label: "下書き", value: stats.draft },
    { label: "非公開", value: stats.archived },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        運営管理へ戻る
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-h1 font-bold text-primary">
            <FileText
              className="h-7 w-7 text-brand-teal-strong"
              aria-hidden="true"
            />
            ブログ管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            全記事のステータス管理・公開承認・カテゴリ/タグ管理を行えます。
          </p>
        </div>
        <Button asChild>
          <Link href="/advisor/posts/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            運営記事を書く
          </Link>
        </Button>
      </header>

      {/* 概要メトリクス */}
      <section aria-labelledby="admin-blog-metrics" className="mt-8">
        <h2 id="admin-blog-metrics" className="sr-only">
          記事の概要
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base"
            >
              <dt className="text-sm text-gray-500">{m.label}</dt>
              <dd className="mt-2 font-heading text-h2 font-bold tabular-nums text-primary">
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12">
        <AdminBlogManager
          posts={posts}
          categories={categories}
          tags={tags}
          approvalRequired={isApprovalRequired()}
        />
      </div>
    </div>
  );
}
