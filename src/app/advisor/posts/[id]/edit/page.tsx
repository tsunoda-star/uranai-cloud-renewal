import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import {
  getEditablePost,
  getBlogCategoriesForForm,
  getBlogTagsForForm,
} from "@/lib/queries";
import { isApprovalRequired } from "@/lib/blog/post-status";
import { PostEditorForm } from "@/components/blog/post-editor-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事を編集",
  robots: { index: false, follow: false },
};

/**
 * /advisor/posts/[id]/edit — 記事編集（AC-C2-10, SEC-3）.
 * RBAC は requireAdvisor。所有権はサーバーで検証: 占い師は authorId=自分の記事のみ。
 * 他人の記事は notFound（存在を秘匿）。ADMIN は全記事編集可（運営は本来 /admin/blog
 * 経由だが、編集 URL を直接踏んでも通す）。
 */
export default async function EditAdvisorPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdvisor(`/advisor/posts/${id}/edit`);

  const post = await getEditablePost(id);
  if (!post) notFound();

  const isAdmin = user.role === "ADMIN";
  // 所有権検証（SEC-3）: 占い師は自記事のみ。他人の記事は notFound（forbidden を秘匿）。
  if (!isAdmin && post.authorId !== user.id) {
    notFound();
  }

  // 占い師が自身のプロフィールを失っている異常系のガード（通常起きない）。
  if (!isAdmin && post.advisorProfileId == null) {
    redirect("/advisor/posts");
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
        記事を編集
      </h1>

      <div className="mt-8">
        <PostEditorForm
          post={post}
          categories={categories}
          tags={tags}
          approvalRequired={isApprovalRequired()}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
