"use client";

import * as React from "react";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Eye,
  Send,
  Archive,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPublishedDate, formatDateTime, toIsoDate } from "@/lib/format";
import { POST_STATUS_LABEL } from "@/lib/blog/post-status";
import {
  changePostStatus,
  deletePost,
  type PostMutationResult,
} from "@/lib/actions/blog-post";
import type { ManagedPostRow } from "@/lib/queries";
import type { PostStatus } from "@prisma/client";

const STATUS_BADGE: Record<
  PostStatus,
  "success" | "warning" | "secondary" | "destructive"
> = {
  PUBLISHED: "success",
  SCHEDULED: "warning",
  DRAFT: "secondary",
  ARCHIVED: "destructive",
};

/**
 * 占い師の自記事一覧（C-2）. status バッジ・編集・プレビュー・状態操作・削除。
 * 状態操作/削除は楽観更新 + サーバ確定。所有権/遷移はすべて Server Action で強制。
 * editBasePath で /advisor or /admin 双方から再利用可能。
 */
export function AdvisorPostList({
  posts: initial,
  editBasePath = "/advisor/posts",
}: {
  posts: ManagedPostRow[];
  editBasePath?: string;
}) {
  const [posts, setPosts] = React.useState(initial);
  React.useEffect(() => setPosts(initial), [initial]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function runMutation(
    id: string,
    optimistic: () => void,
    rollback: () => void,
    fn: () => Promise<PostMutationResult>,
    failMessage: string
  ) {
    setError(null);
    setBusyId(id);
    optimistic();
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        rollback();
        setError(failMessage);
      }
      setBusyId(null);
    });
  }

  function onChangeStatus(post: ManagedPostRow, next: PostStatus) {
    const prev = post.status;
    runMutation(
      post.id,
      () =>
        setPosts((list) =>
          list.map((p) => (p.id === post.id ? { ...p, status: next } : p))
        ),
      () =>
        setPosts((list) =>
          list.map((p) => (p.id === post.id ? { ...p, status: prev } : p))
        ),
      () => changePostStatus(post.id, next),
      "状態の変更に失敗しました。"
    );
  }

  function onDelete(post: ManagedPostRow) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`「${post.title}」を削除します。よろしいですか？`)
    ) {
      return;
    }
    const prev = posts;
    runMutation(
      post.id,
      () => setPosts((list) => list.filter((p) => p.id !== post.id)),
      () => setPosts(prev),
      () => deletePost(post.id),
      "削除に失敗しました。"
    );
  }

  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-8 text-center text-sm text-gray-500">
        まだ記事がありません。「新しい記事を書く」から作成してください。
      </p>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-state-danger">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {posts.map((post) => {
          const busy = busyId === post.id;
          return (
            <li
              key={post.id}
              className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_BADGE[post.status]}>
                      {POST_STATUS_LABEL[post.status]}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {post.category.label}
                    </span>
                  </div>
                  <p className="mt-2 font-heading text-h4 font-semibold text-primary">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-gray-500">
                    {post.status === "SCHEDULED" && post.publishedAt ? (
                      <>公開予定: {formatDateTime(post.publishedAt)}</>
                    ) : post.publishedAt ? (
                      <>
                        公開日:{" "}
                        <time dateTime={toIsoDate(post.publishedAt)}>
                          {formatPublishedDate(post.publishedAt)}
                        </time>
                      </>
                    ) : (
                      <>
                        最終更新:{" "}
                        <time dateTime={toIsoDate(post.updatedAt)}>
                          {formatPublishedDate(post.updatedAt)}
                        </time>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`${editBasePath}/${post.id}/edit`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  編集
                </Link>
                <Link
                  href={`${editBasePath}/${post.id}/preview`}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  プレビュー
                </Link>

                {/* 公開（DRAFT/SCHEDULED/ARCHIVED → PUBLISHED） */}
                {post.status !== "PUBLISHED" && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(post, "PUBLISHED")}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-state-success-fg transition-colors hover:bg-brand-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    公開
                  </button>
                )}

                {/* 取下げ（PUBLISHED/SCHEDULED → ARCHIVED） */}
                {post.status !== "ARCHIVED" && post.status !== "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(post, "ARCHIVED")}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                    取下げ
                  </button>
                )}

                {/* 下書きへ戻す（ARCHIVED → DRAFT） */}
                {post.status === "ARCHIVED" && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(post, "DRAFT")}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    下書きへ
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDelete(post)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-state-danger transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  削除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
