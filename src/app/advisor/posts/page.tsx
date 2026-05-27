import type { Metadata } from "next";
import Link from "next/link";
import { PencilLine, Plus, AlertCircle } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import { getOwnedAdvisorProfileId, getAdvisorOwnPosts } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { AdvisorPostList } from "@/components/blog/advisor-post-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事管理",
  robots: { index: false, follow: false },
};

/**
 * /advisor/posts — 占い師の記事管理（AC-B9-4, C-2）.
 * RBAC は requireAdvisor で強制（SEC-2）。一覧/編集/削除は自記事のみ（SEC-3,
 * advisorProfileId 起点）。ADMIN は専用に /admin/blog で全記事を管理する。
 */
export default async function AdvisorPostsPage() {
  const user = await requireAdvisor("/advisor/posts");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);

  if (!advisorProfileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-heading text-h1 font-bold text-primary">記事管理</h1>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-rose-pale bg-brand-rose-pale/40 p-6">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal-strong"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-primary">
              {user.role === "ADMIN"
                ? "運営アカウントは記事をブログ管理から作成・編集できます。"
                : "占い師プロフィールが未作成です。"}
            </p>
            <div className="mt-4">
              {user.role === "ADMIN" ? (
                <Button asChild variant="navy">
                  <Link href="/admin/blog">ブログ管理へ</Link>
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

  const posts = await getAdvisorOwnPosts(advisorProfileId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-h1 font-bold text-primary">
            <PencilLine
              className="h-7 w-7 text-brand-teal-strong"
              aria-hidden="true"
            />
            記事管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            コラム記事の執筆・下書き・公開・予約投稿を管理できます。
          </p>
        </div>
        <Button asChild>
          <Link href="/advisor/posts/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            新しい記事を書く
          </Link>
        </Button>
      </header>

      <div className="mt-8">
        <AdvisorPostList posts={posts} editBasePath="/advisor/posts" />
      </div>
    </div>
  );
}
