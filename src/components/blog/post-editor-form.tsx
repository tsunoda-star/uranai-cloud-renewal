"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Send,
  CalendarClock,
  Archive,
  AlertCircle,
  Check,
  Eye,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from "@/components/blog/rich-text-editor";
import { savePost, type PostActionState } from "@/lib/actions/blog-post";
import type { EditablePost } from "@/lib/queries";

const initialState: PostActionState = { ok: false };

interface TaxonomyOption {
  id: string;
  slug: string;
  name: string;
}

/**
 * 記事フォーム（AC-C2, component-specs/rich-text-editor.md）.
 * Tiptap 本文 + タイトル/スラッグ/カテゴリ/タグ/アイキャッチ/SEO + 状態操作。
 * 検証・サニタイズ・所有権・状態遷移はすべて Server Action（savePost）側で強制。
 */
export function PostEditorForm({
  post,
  categories,
  tags,
  approvalRequired,
  isAdmin,
}: {
  post: EditablePost | null;
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
  approvalRequired: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const editorRef = React.useRef<RichTextEditorHandle>(null);
  const [state, formAction, pending] = useActionState(savePost, initialState);

  // hidden input に詰める Tiptap JSON 文字列。
  const [contentJson, setContentJson] = React.useState<string>(
    post?.contentJson ? JSON.stringify(post.contentJson) : ""
  );

  const [selectedTags, setSelectedTags] = React.useState<Set<string>>(
    new Set(post?.tagSlugs ?? [])
  );
  const [showSeo, setShowSeo] = React.useState(
    Boolean(post?.seoTitle || post?.seoDescription || post?.ogImageUrl)
  );
  // schedule 用 datetime-local 値。
  const [publishAt, setPublishAt] = React.useState<string>(() =>
    post?.status === "SCHEDULED" && post.publishedAt
      ? toDatetimeLocal(post.publishedAt)
      : ""
  );
  // どのアクションで submit するか（hidden の action 値）。
  const actionRef = React.useRef<HTMLInputElement>(null);

  const isPublished = post?.status === "PUBLISHED";
  const fe = state.fieldErrors;

  // 新規作成成功時、編集画面へ遷移（postId が確定するため）。
  React.useEffect(() => {
    if (state.ok && state.saved && state.postId && !post) {
      router.replace(`/advisor/posts/${state.postId}/edit`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.saved, state.postId]);

  function handleEditorChange(json: unknown) {
    setContentJson(JSON.stringify(json));
  }

  function setAction(action: "draft" | "publish" | "schedule" | "archive") {
    if (actionRef.current) actionRef.current.value = action;
  }

  function toggleTag(slug: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      {post && <input type="hidden" name="postId" value={post.id} />}
      <input type="hidden" name="contentJson" value={contentJson} />
      <input type="hidden" name="tagSlugs" value={[...selectedTags].join(",")} />
      <input ref={actionRef} type="hidden" name="action" defaultValue="draft" />

      {/* フィードバック */}
      {state.error && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-base border border-state-danger/30 bg-destructive/10 px-4 py-3 text-sm text-state-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.ok && state.saved && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-base border border-state-success-fg/30 bg-brand-green/15 px-4 py-3 text-sm text-state-success-fg"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.pendingApproval
            ? "記事を保存しました。公開には運営の承認が必要です（承認待ち）。"
            : "記事を保存しました。"}
        </p>
      )}

      {/* タイトル */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-primary">
          タイトル
        </label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={post?.title ?? ""}
          className="mt-2 h-12 text-lg"
          placeholder="記事のタイトル"
        />
        {fe?.title && <p className="mt-1.5 text-xs text-state-danger">{fe.title}</p>}
      </div>

      {/* 本文（Tiptap） */}
      <div>
        <span className="block text-sm font-medium text-primary">本文</span>
        <div className="mt-2">
          <RichTextEditor
            ref={editorRef}
            initialContent={post?.contentJson}
            onChange={handleEditorChange}
            ariaLabel="記事本文"
          />
        </div>
        {fe?.content && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.content}</p>
        )}
      </div>

      {/* 抜粋 */}
      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-primary">
          抜粋（未入力なら本文から自動生成）
        </label>
        <Textarea
          id="excerpt"
          name="excerpt"
          maxLength={200}
          defaultValue={post?.excerpt ?? ""}
          className="mt-2 min-h-20"
          placeholder="一覧・SNS で表示される短い説明"
        />
      </div>

      {/* カテゴリ + スラッグ */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium text-primary"
          >
            カテゴリ
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={post?.categoryId ?? ""}
            className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fe?.categoryId && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.categoryId}</p>
          )}
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-primary">
            スラッグ（URL）
            {isPublished && (
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                公開後は変更できません
              </span>
            )}
          </label>
          <Input
            id="slug"
            name="slug"
            defaultValue={post?.slug ?? ""}
            disabled={isPublished}
            className="mt-2 h-11 font-mono text-sm"
            placeholder="自動生成（タイトル由来）"
          />
          {fe?.slug && <p className="mt-1.5 text-xs text-state-danger">{fe.slug}</p>}
        </div>
      </div>

      {/* タグ */}
      <fieldset>
        <legend className="text-sm font-medium text-primary">タグ（複数選択可）</legend>
        {tags.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            利用可能なタグがありません（運営がブログ管理で追加できます）。
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => {
              const selected = selectedTags.has(t.slug);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.slug)}
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
                      : "border-gray-200 bg-card text-primary hover:bg-secondary"
                  )}
                >
                  #{t.name}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {/* アイキャッチ */}
      <div>
        <label
          htmlFor="thumbnailUrl"
          className="block text-sm font-medium text-primary"
        >
          アイキャッチ画像 URL（任意）
        </label>
        <Input
          id="thumbnailUrl"
          name="thumbnailUrl"
          type="url"
          defaultValue={post?.thumbnailUrl ?? ""}
          className="mt-2 h-11"
          placeholder="https://…"
        />
        {fe?.thumbnailUrl && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.thumbnailUrl}</p>
        )}
      </div>

      {/* SEO 上書き（折りたたみ） */}
      <div className="rounded-2xl border border-gray-200 bg-card">
        <button
          type="button"
          onClick={() => setShowSeo((v) => !v)}
          aria-expanded={showSeo}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-2xl"
        >
          SEO 設定（任意・上書き）
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              showSeo && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
        {showSeo && (
          <div className="flex flex-col gap-4 border-t border-gray-200 px-5 py-5">
            <div>
              <label
                htmlFor="seoTitle"
                className="block text-sm font-medium text-primary"
              >
                メタタイトル
              </label>
              <Input
                id="seoTitle"
                name="seoTitle"
                maxLength={120}
                defaultValue={post?.seoTitle ?? ""}
                className="mt-2 h-11"
              />
            </div>
            <div>
              <label
                htmlFor="seoDescription"
                className="block text-sm font-medium text-primary"
              >
                メタディスクリプション
              </label>
              <Textarea
                id="seoDescription"
                name="seoDescription"
                maxLength={200}
                defaultValue={post?.seoDescription ?? ""}
                className="mt-2 min-h-20"
              />
            </div>
            <div>
              <label
                htmlFor="ogImageUrl"
                className="block text-sm font-medium text-primary"
              >
                OGP 画像 URL
              </label>
              <Input
                id="ogImageUrl"
                name="ogImageUrl"
                type="url"
                defaultValue={post?.ogImageUrl ?? ""}
                className="mt-2 h-11"
                placeholder="https://…"
              />
              {fe?.ogImageUrl && (
                <p className="mt-1.5 text-xs text-state-danger">{fe.ogImageUrl}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 予約投稿日時 */}
      <div className="rounded-2xl border border-gray-200 bg-card px-5 py-5">
        <label
          htmlFor="publishAt"
          className="block text-sm font-medium text-primary"
        >
          <CalendarClock
            className="mr-1.5 inline h-4 w-4 text-brand-teal-strong"
            aria-hidden="true"
          />
          予約投稿の公開日時（「予約投稿」で保存する場合のみ）
        </label>
        <Input
          id="publishAt"
          name="publishAt"
          type="datetime-local"
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
          className="mt-2 h-11 w-full sm:w-auto"
        />
        {fe?.publishAt && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.publishAt}</p>
        )}
        {approvalRequired && !isAdmin && (
          <p className="mt-3 flex items-start gap-2 text-xs text-state-warning-fg">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            公開承認フローが有効です。「公開」「予約投稿」は運営の承認後に反映されます。
          </p>
        )}
      </div>

      {/* アクション */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-background/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <Button
          type="submit"
          variant="outline"
          disabled={pending}
          onClick={() => setAction("draft")}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          下書き保存
        </Button>
        <Button
          type="submit"
          disabled={pending}
          onClick={() => setAction("publish")}
          className="font-semibold"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {approvalRequired && !isAdmin ? "公開申請" : isPublished ? "更新を公開" : "公開する"}
        </Button>
        <Button
          type="submit"
          variant="navy"
          disabled={pending}
          onClick={() => setAction("schedule")}
        >
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          予約投稿
        </Button>
        {post && post.status !== "ARCHIVED" && (
          <Button
            type="submit"
            variant="ghost"
            disabled={pending}
            onClick={() => setAction("archive")}
            className="text-state-danger hover:bg-destructive/10"
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            非公開（取下げ）
          </Button>
        )}
        <div className="ms-auto flex items-center gap-3">
          {post && (
            <Link
              href={`/advisor/posts/${post.id}/preview`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-3 text-sm font-medium text-brand-teal-strong hover:bg-brand-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              プレビュー
            </Link>
          )}
          {pending && <span className="text-sm text-gray-500">保存中…</span>}
        </div>
      </div>
    </form>
  );
}

/** Date → datetime-local 入力値（ローカルタイムゾーン）。 */
function toDatetimeLocal(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
