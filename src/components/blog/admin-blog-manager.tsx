"use client";

import * as React from "react";
import Link from "next/link";
import {
  Send,
  Archive,
  Undo2,
  Pencil,
  Eye,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPublishedDate, formatDateTime, toIsoDate } from "@/lib/format";
import { POST_STATUS_LABEL } from "@/lib/blog/post-status";
import { adminChangePostStatus } from "@/lib/actions/admin-blog";
import {
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  createBlogTag,
  updateBlogTag,
  deleteBlogTag,
  type AdminBlogResult,
} from "@/lib/actions/admin-blog";
import type { ManagedPostRow, AdminTaxonomyRow } from "@/lib/queries";
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

const STATUS_FILTERS: ReadonlyArray<{ key: "ALL" | PostStatus; label: string }> = [
  { key: "ALL", label: "すべて" },
  { key: "DRAFT", label: "下書き" },
  { key: "SCHEDULED", label: "予約投稿" },
  { key: "PUBLISHED", label: "公開中" },
  { key: "ARCHIVED", label: "非公開" },
];

/**
 * 運営ブログ管理（AC-C3-1〜4）.
 * - 全記事の status 一覧 / フィルタ / 変更（承認公開・archive・差戻し）。
 * - カテゴリ・タグ CRUD。
 * すべてのミューテーションは ADMIN 限定 Server Action で強制（client 制御に依存しない）。
 */
export function AdminBlogManager({
  posts: initialPosts,
  categories: initialCategories,
  tags: initialTags,
  approvalRequired,
}: {
  posts: ManagedPostRow[];
  categories: AdminTaxonomyRow[];
  tags: AdminTaxonomyRow[];
  approvalRequired: boolean;
}) {
  return (
    <div className="flex flex-col gap-12">
      <PostManagementSection posts={initialPosts} approvalRequired={approvalRequired} />
      <TaxonomySection
        title="カテゴリ"
        kind="category"
        rows={initialCategories}
      />
      <TaxonomySection title="タグ" kind="tag" rows={initialTags} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 記事 status 管理
// ---------------------------------------------------------------------------

function PostManagementSection({
  posts: initial,
  approvalRequired,
}: {
  posts: ManagedPostRow[];
  approvalRequired: boolean;
}) {
  const [posts, setPosts] = React.useState(initial);
  React.useEffect(() => setPosts(initial), [initial]);
  const [filter, setFilter] = React.useState<"ALL" | PostStatus>("ALL");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const visible =
    filter === "ALL" ? posts : posts.filter((p) => p.status === filter);

  function onChangeStatus(post: ManagedPostRow, next: PostStatus) {
    setError(null);
    setBusyId(post.id);
    const prev = post.status;
    setPosts((list) =>
      list.map((p) => (p.id === post.id ? { ...p, status: next } : p))
    );
    startTransition(async () => {
      const result = await adminChangePostStatus(post.id, next);
      if (!result.ok) {
        setPosts((list) =>
          list.map((p) => (p.id === post.id ? { ...p, status: prev } : p))
        );
        setError(messageFor(result, "状態の変更に失敗しました。"));
      }
      setBusyId(null);
    });
  }

  return (
    <section aria-labelledby="admin-blog-posts">
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="admin-blog-posts"
          className="font-heading text-h3 font-semibold text-primary"
        >
          記事一覧
        </h2>
        <Badge variant="secondary">{posts.length}</Badge>
        {approvalRequired && (
          <Badge variant="warning">公開承認フロー: 有効</Badge>
        )}
      </div>

      {/* status フィルタ */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="ステータスで絞り込み">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.key === "ALL"
              ? posts.length
              : posts.filter((p) => p.status === f.key).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active
                  ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
                  : "border-gray-200 bg-card text-primary hover:bg-secondary"
              )}
            >
              {f.label}
              <span className="tabular-nums text-xs text-gray-400">{count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-state-danger">
          {error}
        </p>
      )}

      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th scope="col" className="px-4 py-3 font-medium">タイトル</th>
                <th scope="col" className="px-4 py-3 font-medium">著者</th>
                <th scope="col" className="px-4 py-3 font-medium">カテゴリ</th>
                <th scope="col" className="px-4 py-3 font-medium">状態</th>
                <th scope="col" className="px-4 py-3 font-medium">日時</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    該当する記事はありません。
                  </td>
                </tr>
              ) : (
                visible.map((post) => {
                  const busy = busyId === post.id;
                  return (
                    <tr key={post.id}>
                      <td className="px-4 py-3 font-medium text-primary">
                        <span className="line-clamp-1">{post.title}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {post.authorAdvisorSlug ? (
                          <span className="inline-flex items-center gap-1">
                            {post.authorDisplayName}
                            <Badge variant="accent">占い師</Badge>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {post.authorDisplayName}
                            <Badge variant="secondary">運営</Badge>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {post.category.label}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_BADGE[post.status]}>
                          {POST_STATUS_LABEL[post.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-xs text-gray-500">
                        {post.status === "SCHEDULED" && post.publishedAt ? (
                          formatDateTime(post.publishedAt)
                        ) : post.publishedAt ? (
                          <time dateTime={toIsoDate(post.publishedAt)}>
                            {formatPublishedDate(post.publishedAt)}
                          </time>
                        ) : (
                          <time dateTime={toIsoDate(post.updatedAt)}>
                            {formatPublishedDate(post.updatedAt)}
                          </time>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            href={`/advisor/posts/${post.id}/preview`}
                            target="_blank"
                            rel="noopener"
                            aria-label={`${post.title} をプレビュー`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-base border border-input text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/advisor/posts/${post.id}/edit`}
                            aria-label={`${post.title} を編集`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-base border border-input text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {post.status !== "PUBLISHED" && (
                            <button
                              type="button"
                              onClick={() => onChangeStatus(post, "PUBLISHED")}
                              disabled={busy}
                              aria-label={`${post.title} を${approvalRequired ? "承認して" : ""}公開`}
                              title={approvalRequired ? "承認して公開" : "公開"}
                              className="inline-flex h-9 items-center gap-1 rounded-base border border-input px-2.5 text-xs font-medium text-state-success-fg transition-colors hover:bg-brand-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              <Send className="h-3.5 w-3.5" aria-hidden="true" />
                              {approvalRequired ? "承認公開" : "公開"}
                            </button>
                          )}
                          {post.status !== "ARCHIVED" && post.status !== "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => onChangeStatus(post, "ARCHIVED")}
                              disabled={busy}
                              aria-label={`${post.title} を非公開（アーカイブ）`}
                              title="アーカイブ"
                              className="inline-flex h-9 items-center gap-1 rounded-base border border-input px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                              archive
                            </button>
                          )}
                          {post.status === "ARCHIVED" && (
                            <button
                              type="button"
                              onClick={() => onChangeStatus(post, "DRAFT")}
                              disabled={busy}
                              aria-label={`${post.title} を下書きへ戻す`}
                              title="下書きへ戻す"
                              className="inline-flex h-9 items-center gap-1 rounded-base border border-input px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                            >
                              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                              下書き
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// カテゴリ / タグ CRUD（共通）
// ---------------------------------------------------------------------------

function TaxonomySection({
  title,
  kind,
  rows: initial,
}: {
  title: string;
  kind: "category" | "tag";
  rows: AdminTaxonomyRow[];
}) {
  const [rows, setRows] = React.useState(initial);
  React.useEffect(() => setRows(initial), [initial]);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);

  function clearMsg() {
    setError(null);
    setNotice(null);
  }

  function onCreate(formData: FormData) {
    clearMsg();
    setCreating(true);
    startTransition(async () => {
      const fn = kind === "category" ? createBlogCategory : createBlogTag;
      const result = await fn(formData);
      if (result.ok) {
        setNotice(`${title}を追加しました（反映には数秒かかる場合があります）。`);
        formRef.current?.reset();
      } else {
        setError(messageFor(result, "追加に失敗しました。"));
      }
      setCreating(false);
    });
  }

  function onUpdate(id: string, formData: FormData) {
    clearMsg();
    setBusyId(id);
    startTransition(async () => {
      const fn =
        kind === "category"
          ? (fd: FormData) => updateBlogCategory(id, fd)
          : (fd: FormData) => updateBlogTag(id, fd);
      const result = await fn(formData);
      if (result.ok) {
        setNotice(`${title}を更新しました。`);
        setEditingId(null);
      } else {
        setError(messageFor(result, "更新に失敗しました。"));
      }
      setBusyId(null);
    });
  }

  function onDelete(row: AdminTaxonomyRow) {
    clearMsg();
    if (row.postCount > 0) {
      setError(`「${row.name}」には ${row.postCount} 件の記事が紐づくため削除できません。`);
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(`${title}「${row.name}」を削除します。よろしいですか？`)
    ) {
      return;
    }
    setBusyId(row.id);
    const prev = rows;
    setRows((list) => list.filter((r) => r.id !== row.id));
    startTransition(async () => {
      const fn = kind === "category" ? deleteBlogCategory : deleteBlogTag;
      const result = await fn(row.id);
      if (!result.ok) {
        setRows(prev);
        setError(messageFor(result, "削除に失敗しました。"));
      } else {
        setNotice(`${title}を削除しました。`);
      }
      setBusyId(null);
    });
  }

  return (
    <section aria-labelledby={`admin-blog-${kind}`}>
      <div className="flex items-center gap-2">
        <h2
          id={`admin-blog-${kind}`}
          className="font-heading text-h3 font-semibold text-primary"
        >
          {title}管理
        </h2>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-state-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 flex items-start gap-2 text-sm text-state-success-fg">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}

      {/* 追加フォーム */}
      <form
        ref={formRef}
        action={onCreate}
        className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-card p-5 shadow-base sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor={`${kind}-name`}
            className="block text-xs font-medium text-gray-500"
          >
            名称
          </label>
          <Input id={`${kind}-name`} name="name" required maxLength={40} className="mt-1.5 h-11" />
        </div>
        <div className="flex-1">
          <label
            htmlFor={`${kind}-slug`}
            className="block text-xs font-medium text-gray-500"
          >
            スラッグ（任意・未入力なら自動）
          </label>
          <Input
            id={`${kind}-slug`}
            name="slug"
            maxLength={80}
            className="mt-1.5 h-11 font-mono text-sm"
            placeholder="例: love-luck"
          />
        </div>
        {kind === "category" && (
          <div className="flex-1">
            <label
              htmlFor="category-description"
              className="block text-xs font-medium text-gray-500"
            >
              説明（任意）
            </label>
            <Input
              id="category-description"
              name="description"
              maxLength={200}
              className="mt-1.5 h-11"
            />
          </div>
        )}
        <Button type="submit" disabled={creating} className="shrink-0">
          <Plus className="h-4 w-4" aria-hidden="true" />
          追加
        </Button>
      </form>

      {/* 一覧 */}
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((row) => {
          const busy = busyId === row.id;
          const isEditing = editingId === row.id;
          return (
            <li
              key={row.id}
              className="rounded-2xl border border-gray-200 bg-card p-4 shadow-base"
            >
              {isEditing ? (
                <form
                  action={(fd) => onUpdate(row.id, fd)}
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500">
                      名称
                    </label>
                    <Input
                      name="name"
                      required
                      maxLength={40}
                      defaultValue={row.name}
                      className="mt-1.5 h-11"
                    />
                  </div>
                  {kind === "category" && (
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500">
                        説明
                      </label>
                      <Textarea
                        name="description"
                        maxLength={200}
                        defaultValue={row.description ?? ""}
                        className="mt-1.5 min-h-11"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={busy}>
                      保存
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">
                      {row.name}{" "}
                      <span className="font-mono text-xs text-gray-400">
                        /{row.slug}
                      </span>
                    </p>
                    {row.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {row.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{row.postCount} 記事</Badge>
                    <button
                      type="button"
                      onClick={() => setEditingId(row.id)}
                      className="inline-flex h-9 items-center gap-1 rounded-base border border-input px-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      disabled={busy || row.postCount > 0}
                      title={row.postCount > 0 ? "記事が紐づくため削除できません" : undefined}
                      className="inline-flex h-9 items-center gap-1 rounded-base border border-input px-2.5 text-xs font-medium text-state-danger transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      削除
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function messageFor(result: AdminBlogResult, fallback: string): string {
  if (result.message) return result.message;
  switch (result.error) {
    case "forbidden":
    case "unauthenticated":
      return "権限がありません。";
    case "invalid_transition":
      return "その状態変更はできません。";
    case "in_use":
      return "使用中のため削除できません。";
    case "duplicate_slug":
      return "スラッグが重複しています。";
    default:
      return fallback;
  }
}
