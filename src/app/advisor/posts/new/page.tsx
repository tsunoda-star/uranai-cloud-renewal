import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import {
  getOwnedAdvisorProfileId,
  getBlogCategoriesForForm,
  getBlogTagsForForm,
} from "@/lib/queries";
import { isApprovalRequired } from "@/lib/blog/post-status";
import { Button } from "@/components/ui/button";
import { PostEditorForm } from "@/components/blog/post-editor-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "新しい記事",
  robots: { index: false, follow: false },
};

/**
 * /advisor/posts/new — 新規記事作成（AC-C2）.
 * RBAC は requireAdvisor で強制。C-4: 占い師投稿は advisorProfileId=本人で保存
 * （Server Action 側でサーバ解決）。ADMIN は運営記事（advisorProfileId=null）。
 */
export default async function NewAdvisorPostPage() {
  const user = await requireAdvisor("/advisor/posts/new");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);
  const isAdmin = user.role === "ADMIN";

  // 占い師（非 ADMIN）はプロフィール必須。ADMIN は profile 不要（運営記事）。
  if (!isAdmin && !advisorProfileId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-heading text-h1 font-bold text-primary">新しい記事</h1>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-rose-pale bg-brand-rose-pale/40 p-6">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal-strong"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-primary">
              占い師プロフィールが未作成です。
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/register/advisor">占い師登録を完了する</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [categories, tags] = await Promise.all([
    getBlogCategoriesForForm(),
    getBlogTagsForForm(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <Link
        href="/advisor/posts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        記事管理へ戻る
      </Link>
      <h1 className="mt-4 font-heading text-h1 font-bold text-primary">
        新しい記事を書く
      </h1>

      <div className="mt-8">
        <PostEditorForm
          post={null}
          categories={categories}
          tags={tags}
          approvalRequired={isApprovalRequired()}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
