"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import {
  tiptapJsonToSafeHtml,
  tiptapJsonToPlainText,
  buildExcerpt,
  isTiptapDoc,
} from "@/lib/blog/content-html";
import { makeUniqueSlug, isValidSlug, slugify } from "@/lib/blog/slug";
import {
  canTransition,
  coercePostStatus,
  isApprovalRequired,
  isSlugLocked,
  statusForAction,
  type PostSaveAction,
} from "@/lib/blog/post-status";

/**
 * 占い師/運営の記事投稿・編集 Server Action（AC-C2-1〜10, spec §4.2/§5.2, SEC-3/SEC-5）.
 *
 * 不変条件:
 * - RBAC (SEC-2): FORTUNE_TELLER / ADMIN のみ。GENERAL は拒否（client に依存しない）。
 * - 所有権 (SEC-3): 占い師は自記事のみ編集/削除。ADMIN は全記事可。postId は DB で
 *   authorId / advisorProfileId を再解決して検証（client 値を信頼しない）。
 * - サニタイズ (SEC-5): 本文は Tiptap JSON を受け取り、サーバーで allow-list HTML 化
 *   （tiptapJsonToSafeHtml）。client 由来 HTML は一切保存しない。title/seo/excerpt は
 *   sanitizeText でエスケープ。
 * - 状態遷移 (§5.2): canTransition で不正遷移を拒否。公開後 slug 不変（SEO-16）。
 * - C-4 統合: 占い師投稿は authorId=本人 User + advisorProfileId=本人 profile。運営は
 *   advisorProfileId=null（運営記事）。
 */

const TITLE_MIN = 2;
const TITLE_MAX = 120;
const EXCERPT_MAX = 200;
const SEO_TITLE_MAX = 120;
const SEO_DESC_MAX = 200;
const URL_MAX = 2048;

export interface PostActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "content"
      | "categoryId"
      | "slug"
      | "publishAt"
      | "thumbnailUrl"
      | "ogImageUrl",
      string
    >
  >;
  saved?: boolean;
  /** 保存後の id（新規作成→編集画面へ遷移する際に使用）。 */
  postId?: string;
  /** 保存後の slug（公開済みなら表示）。 */
  slug?: string;
  /** 承認待ち（承認フロー ON & 占い師の公開要求時）。 */
  pendingApproval?: boolean;
}

export interface PostMutationResult {
  ok: boolean;
  error?:
    | "unauthenticated"
    | "not_advisor"
    | "forbidden"
    | "not_found"
    | "invalid_transition";
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** http(s) または相対パスのみ許可する URL バリデータ（thumbnail/ogImage 用）。 */
function validUrlOrNull(raw: string): { ok: true; value: string | null } | { ok: false } {
  const v = raw.trim();
  if (v === "") return { ok: true, value: null };
  if (v.length > URL_MAX) return { ok: false };
  if (v.startsWith("/")) return { ok: true, value: v };
  if (/^https?:\/\/[^\s]+$/i.test(v)) return { ok: true, value: v };
  return { ok: false };
}

interface OwnerContext {
  userId: string;
  isAdmin: boolean;
  /** 自分の占い師プロフィール id（占い師のみ。ADMIN は null のこともある）。 */
  advisorProfileId: string | null;
}

/** RBAC: FORTUNE_TELLER / ADMIN のみ。所有権の起点 profile.id を解決。 */
async function resolveOwner(): Promise<
  { ok: true; ctx: OwnerContext } | { ok: false; error: PostMutationResult["error"] }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.role !== "FORTUNE_TELLER" && user.role !== "ADMIN") {
    return { ok: false, error: "not_advisor" };
  }
  const profile = await db.fortuneTellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return {
    ok: true,
    ctx: {
      userId: user.id,
      isAdmin: user.role === "ADMIN",
      advisorProfileId: profile?.id ?? null,
    },
  };
}

/** slug 一意性判定（自記事 excludeId は衝突から除外）。 */
async function slugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await db.blogPost.findUnique({
    where: { slug },
    select: { id: true },
  });
  return existing != null && existing.id !== excludeId;
}

/**
 * 記事の保存（作成/更新, useActionState 用）.
 * formData:
 *  - postId?      : 編集対象（あれば更新、なければ作成）
 *  - title        : タイトル
 *  - contentJson  : Tiptap doc JSON 文字列
 *  - excerpt?     : 抜粋（未入力なら本文から自動生成）
 *  - categoryId   : BlogCategory.id（1つ）
 *  - tagSlugs?    : カンマ区切りの tag slug 群（複数）
 *  - thumbnailUrl?: アイキャッチ URL
 *  - slug?        : 手動上書き slug（未入力ならタイトル由来 + 一意化）
 *  - seoTitle? / seoDescription? / ogImageUrl? : SEO 上書き（任意）
 *  - action       : draft | publish | schedule | archive
 *  - publishAt?   : schedule 時の公開日時（datetime-local 文字列, 未来必須）
 */
export async function savePost(
  _prev: PostActionState,
  formData: FormData
): Promise<PostActionState> {
  const owner = await resolveOwner();
  if (!owner.ok) {
    return {
      ok: false,
      error:
        owner.error === "not_advisor"
          ? "記事を投稿する権限がありません。"
          : "ログインが必要です。",
    };
  }
  const ctx = owner.ctx;

  const postId = asString(formData.get("postId")).trim();
  const fieldErrors: PostActionState["fieldErrors"] = {};

  // --- title ---
  const titleRaw = asString(formData.get("title")).trim();
  if (titleRaw.length < TITLE_MIN) {
    fieldErrors.title = `タイトルは${TITLE_MIN}文字以上で入力してください。`;
  } else if (titleRaw.length > TITLE_MAX) {
    fieldErrors.title = `タイトルは${TITLE_MAX}文字以内で入力してください。`;
  }

  // --- content (Tiptap JSON) ---
  let contentDoc: unknown = null;
  const contentRaw = asString(formData.get("contentJson"));
  if (contentRaw.trim() === "") {
    fieldErrors.content = "本文を入力してください。";
  } else {
    try {
      contentDoc = JSON.parse(contentRaw);
    } catch {
      contentDoc = null;
    }
    if (!isTiptapDoc(contentDoc)) {
      fieldErrors.content = "本文の形式が正しくありません。";
    } else if (tiptapJsonToPlainText(contentDoc).trim() === "") {
      fieldErrors.content = "本文を入力してください。";
    }
  }

  // --- category ---
  const categoryId = asString(formData.get("categoryId")).trim();
  if (!categoryId) fieldErrors.categoryId = "カテゴリを選択してください。";

  // --- action / status ---
  const action = asString(formData.get("action")).trim() as PostSaveAction;
  const validActions: readonly PostSaveAction[] = [
    "draft",
    "publish",
    "schedule",
    "archive",
  ];
  if (!(validActions as readonly string[]).includes(action)) {
    return { ok: false, error: "不正な操作です。" };
  }
  const targetStatus = statusForAction(action);

  // --- schedule: publishAt（未来必須） ---
  let publishAt: Date | null = null;
  if (action === "schedule") {
    const raw = asString(formData.get("publishAt")).trim();
    const parsed = raw ? new Date(raw) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      fieldErrors.publishAt = "公開予定日時を指定してください。";
    } else if (parsed.getTime() <= Date.now()) {
      fieldErrors.publishAt = "公開予定日時は未来の時刻を指定してください。";
    } else {
      publishAt = parsed;
    }
  }

  // --- URLs ---
  const thumbResult = validUrlOrNull(asString(formData.get("thumbnailUrl")));
  if (!thumbResult.ok) {
    fieldErrors.thumbnailUrl = "URL は http(s):// で始まる形式で入力してください。";
  }
  const ogResult = validUrlOrNull(asString(formData.get("ogImageUrl")));
  if (!ogResult.ok) {
    fieldErrors.ogImageUrl = "URL は http(s):// で始まる形式で入力してください。";
  }

  // --- 手動 slug の形式検証（任意） ---
  const manualSlugRaw = asString(formData.get("slug")).trim().toLowerCase();
  if (manualSlugRaw && !isValidSlug(manualSlugRaw)) {
    fieldErrors.slug =
      "スラッグは英小文字・数字・ハイフンのみ使用できます（例: tarot-guide）。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "入力内容を確認してください。", fieldErrors };
  }

  // category 実在検証。
  const category = await db.blogCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    return {
      ok: false,
      error: "入力内容を確認してください。",
      fieldErrors: { categoryId: "カテゴリを選択してください。" },
    };
  }

  // tag slug 群 → 実在する tag id に解決（不在 slug は黙って無視）。
  const tagSlugs = asString(formData.get("tagSlugs"))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const tagRows =
    tagSlugs.length > 0
      ? await db.blogTag.findMany({
          where: { slug: { in: tagSlugs } },
          select: { id: true },
        })
      : [];
  const tagIds = tagRows.map((t) => t.id);

  // --- 本文 HTML 化（allow-list, SEC-5）+ excerpt ---
  const contentHtml = tiptapJsonToSafeHtml(contentDoc);
  const excerptRaw = asString(formData.get("excerpt")).trim();
  // 手動入力・本文由来いずれも sanitizeText でエスケープ（excerpt は meta description /
  // 一覧テキストに使われるため defense-in-depth）。本文由来は plain text を再エスケープ。
  const excerpt =
    excerptRaw.length > 0
      ? sanitizeText(excerptRaw, EXCERPT_MAX)
      : sanitizeText(buildExcerpt(contentDoc, 160), EXCERPT_MAX);

  const title = sanitizeText(titleRaw, TITLE_MAX);

  const seoTitleRaw = asString(formData.get("seoTitle")).trim();
  const seoTitle = seoTitleRaw ? sanitizeText(seoTitleRaw, SEO_TITLE_MAX) : null;
  const seoDescRaw = asString(formData.get("seoDescription")).trim();
  const seoDescription = seoDescRaw ? sanitizeText(seoDescRaw, SEO_DESC_MAX) : null;
  const thumbnailUrl = thumbResult.ok ? thumbResult.value : null;
  const ogImageUrl = ogResult.ok ? ogResult.value : null;

  // 承認フロー（AC-C3-3）: 設定 ON かつ「占い師（非 ADMIN）」が公開要求した場合、
  // 即時公開せず DRAFT のまま保持し、承認待ちを通知する。
  let effectiveStatus = targetStatus;
  let pendingApproval = false;
  if (
    isApprovalRequired() &&
    !ctx.isAdmin &&
    (action === "publish" || action === "schedule")
  ) {
    effectiveStatus = "DRAFT";
    pendingApproval = true;
  }

  // =========================================================================
  // 更新
  // =========================================================================
  if (postId) {
    const existing = await db.blogPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
        authorId: true,
        advisorProfileId: true,
      },
    });
    if (!existing) return { ok: false, error: "対象の記事が見つかりません。" };

    // 所有権検証（占い師は自記事のみ。ADMIN は全件可）。
    if (!ctx.isAdmin && existing.authorId !== ctx.userId) {
      return { ok: false, error: "この記事を編集する権限がありません。" };
    }

    // 状態遷移検証（pendingApproval で DRAFT 据え置きのケースは draft 遷移として扱う）。
    if (!pendingApproval && !canTransition(existing.status, effectiveStatus)) {
      return {
        ok: false,
        error: `現在の状態（${existing.status}）からその操作はできません。`,
      };
    }

    // slug 決定。公開済み（PUBLISHED/ARCHIVED）は不変（SEO-16）。
    let slug = existing.slug;
    if (!isSlugLocked(existing.status)) {
      const desired = manualSlugRaw || titleRaw;
      slug = await makeUniqueSlug(desired, (s) => slugTaken(s, existing.id));
    }

    // publishedAt の決定。
    let publishedAt = existing.publishedAt;
    if (effectiveStatus === "PUBLISHED") {
      // 既に公開済みなら publishedAt を保持、未設定なら now。
      publishedAt = existing.publishedAt ?? new Date();
    } else if (effectiveStatus === "SCHEDULED") {
      publishedAt = publishAt;
    } else if (effectiveStatus === "DRAFT" && !pendingApproval) {
      publishedAt = null;
    }

    await db.$transaction(async (tx) => {
      await tx.blogPost.update({
        where: { id: existing.id },
        data: {
          title,
          excerpt,
          contentJson: contentDoc as object,
          contentHtml,
          thumbnailUrl,
          status: effectiveStatus,
          publishedAt,
          slug,
          categoryId,
          seoTitle,
          seoDescription,
          ogImageUrl,
        },
      });
      // タグ差し替え（全削除 → 再作成。件数が小さく単純で安全）。
      await tx.blogPostTag.deleteMany({ where: { postId: existing.id } });
      if (tagIds.length > 0) {
        await tx.blogPostTag.createMany({
          data: tagIds.map((tagId) => ({ postId: existing.id, tagId })),
          skipDuplicates: true,
        });
      }
    });

    revalidateBlogSurfaces(slug);
    return {
      ok: true,
      saved: true,
      postId: existing.id,
      slug,
      pendingApproval,
    };
  }

  // =========================================================================
  // 作成
  // =========================================================================
  // C-4: 占い師は authorId=本人 + advisorProfileId=本人 profile。
  //      ADMIN は authorId=本人 + advisorProfileId=null（運営記事）。
  const advisorProfileId = ctx.isAdmin ? null : ctx.advisorProfileId;
  if (!ctx.isAdmin && !advisorProfileId) {
    return {
      ok: false,
      error: "占い師プロフィールが未作成です。先に占い師登録を完了してください。",
    };
  }

  const desired = manualSlugRaw || titleRaw || slugify(titleRaw);
  const slug = await makeUniqueSlug(desired, (s) => slugTaken(s));

  const publishedAt =
    effectiveStatus === "PUBLISHED"
      ? new Date()
      : effectiveStatus === "SCHEDULED"
        ? publishAt
        : null;

  const created = await db.blogPost.create({
    data: {
      authorId: ctx.userId,
      advisorProfileId,
      categoryId,
      slug,
      title,
      excerpt,
      contentJson: contentDoc as object,
      contentHtml,
      thumbnailUrl,
      status: effectiveStatus,
      publishedAt,
      seoTitle,
      seoDescription,
      ogImageUrl,
      tags:
        tagIds.length > 0
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
    },
    select: { id: true, slug: true },
  });

  revalidateBlogSurfaces(created.slug);
  return {
    ok: true,
    saved: true,
    postId: created.id,
    slug: created.slug,
    pendingApproval,
  };
}

/**
 * 記事の状態変更（一覧からのワンクリック操作: 公開 / 取下げ(archive) / 下書きへ）.
 * 所有権 + 状態遷移を検証。SCHEDULED への変更は publishAt が必要なので扱わない
 * （エディタ経由）。
 */
export async function changePostStatus(
  postId: string,
  next: string
): Promise<PostMutationResult> {
  const owner = await resolveOwner();
  if (!owner.ok) return { ok: false, error: owner.error };
  const ctx = owner.ctx;

  const target = coercePostStatus(next);
  if (!target || target === "SCHEDULED") {
    return { ok: false, error: "invalid_transition" };
  }

  const existing = await db.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      slug: true,
      status: true,
      publishedAt: true,
      authorId: true,
    },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (!ctx.isAdmin && existing.authorId !== ctx.userId) {
    return { ok: false, error: "forbidden" };
  }
  if (!canTransition(existing.status, target)) {
    return { ok: false, error: "invalid_transition" };
  }

  const publishedAt =
    target === "PUBLISHED"
      ? (existing.publishedAt ?? new Date())
      : target === "DRAFT"
        ? null
        : existing.publishedAt;

  await db.blogPost.update({
    where: { id: existing.id },
    data: { status: target, publishedAt },
  });

  revalidateBlogSurfaces(existing.slug);
  return { ok: true };
}

/** 記事削除（所有権検証）。 */
export async function deletePost(postId: string): Promise<PostMutationResult> {
  const owner = await resolveOwner();
  if (!owner.ok) return { ok: false, error: owner.error };
  const ctx = owner.ctx;

  const existing = await db.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, authorId: true },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (!ctx.isAdmin && existing.authorId !== ctx.userId) {
    return { ok: false, error: "forbidden" };
  }

  await db.blogPost.delete({ where: { id: existing.id } });
  revalidateBlogSurfaces(existing.slug);
  return { ok: true };
}

/** 公開系サーフェスの再検証（一覧・管理・カタログ統合先・記事詳細）。 */
function revalidateBlogSurfaces(slug: string): void {
  revalidatePath("/advisor/posts");
  revalidatePath("/advisor");
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
}
