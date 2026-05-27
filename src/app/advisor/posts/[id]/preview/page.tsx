import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Eye } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import { getPostForPreview } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPublishedDate, formatDateTime, toIsoDate } from "@/lib/format";
import { POST_STATUS_LABEL } from "@/lib/blog/post-status";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事プレビュー",
  robots: { index: false, follow: false },
};

/**
 * /advisor/posts/[id]/preview — 記事プレビュー（本人/運営限定）.
 *
 * draft / scheduled / archived を含め、公開前の見た目を本人または運営が確認できる。
 * 公開ページ（/blog/[slug]）は publishedPostWhere() のままなので未公開記事は notFound
 * のまま（W5a を変更しない）。所有権 (SEC-3): 占い師は自記事のみ。他人/不在は notFound。
 * 本文は保存時に生成済みの contentHtml（サニタイズ済, SEC-5）をそのまま表示。
 */
export default async function PostPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdvisor(`/advisor/posts/${id}/preview`);

  const post = await getPostForPreview(id);
  if (!post) notFound();

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && post.authorId !== user.id) {
    notFound();
  }

  const isAdvisorAuthor = post.author.advisorSlug != null;
  const dateLine =
    post.status === "SCHEDULED" && post.publishedAt
      ? `公開予定 ${formatDateTime(post.publishedAt)}`
      : post.publishedAt
        ? formatPublishedDate(post.publishedAt)
        : `最終更新 ${formatPublishedDate(post.updatedAt)}`;

  return (
    <div className="mx-auto max-w-container px-4 py-8 sm:px-6">
      {/* プレビューバナー（公開ページではない明示） */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-rose-pale bg-brand-rose-pale/50 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-teal-strong">
          <Eye className="h-4 w-4" aria-hidden="true" />
          プレビュー表示（公開ページには未公開記事は表示されません）
        </p>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{POST_STATUS_LABEL[post.status]}</Badge>
          <Link
            href={`/advisor/posts/${post.id}/edit`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-3 text-sm font-medium text-primary hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            編集に戻る
          </Link>
        </div>
      </div>

      <article className="mx-auto mt-8 max-w-content">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">{post.category.label}</Badge>
            <time
              dateTime={toIsoDate(post.publishedAt ?? post.updatedAt)}
              className="text-sm tabular-nums text-gray-500"
            >
              {dateLine}
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

          <div className="mt-6 flex items-center gap-3 border-y border-gray-200 py-4">
            <Avatar
              name={post.author.displayName}
              src={post.author.avatarUrl}
              size="md"
            />
            <div className="min-w-0">
              <span className="font-medium text-primary">
                {post.author.displayName}
              </span>
              <p className="text-xs text-gray-500">
                {isAdvisorAuthor ? "占い師" : "占いクラウド運営"}
              </p>
            </div>
          </div>
        </header>

        {post.thumbnailUrl && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-brand-rose-pale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnailUrl}
              alt=""
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* 本文（contentHtml は保存時にサニタイズ済, SEC-5）。 */}
        <div
          className="prose mt-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />

        {post.tags.length > 0 && (
          <div className="mt-10 border-t border-gray-200 pt-6">
            <h2 className="text-sm font-semibold text-gray-600">タグ</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <li
                  key={t.slug}
                  className="inline-flex min-h-9 items-center rounded-full border border-gray-200 bg-card px-4 py-1.5 text-sm font-medium text-primary"
                >
                  #{t.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <div className="mx-auto mt-12 max-w-content">
        <Link
          href="/advisor/posts"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          記事管理へ戻る
        </Link>
      </div>
    </div>
  );
}
