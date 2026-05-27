"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { slugify, isValidSlug } from "@/lib/blog/slug";
import {
  canTransition,
  coercePostStatus,
} from "@/lib/blog/post-status";

/**
 * 運営ブログ管理 Server Action（AC-C3-1〜4, spec §3）.
 *
 * 不変条件:
 * - RBAC (SEC-2): ADMIN のみ。client 制御に依存しない。
 * - 記事の status 変更（公開承認・archive・差戻し）は状態遷移を検証（§5.2）。
 * - カテゴリ/タグ CRUD: slug 形式検証 + 一意性。記事が紐づくカテゴリ/タグは削除不可
 *   （参照整合性: BlogPost.categoryId は必須なので空にできない）。
 */

const NAME_MIN = 1;
const NAME_MAX = 40;
const DESC_MAX = 200;

export interface AdminBlogResult {
  ok: boolean;
  error?:
    | "unauthenticated"
    | "forbidden"
    | "not_found"
    | "invalid_transition"
    | "in_use"
    | "duplicate_slug"
    | "validation";
  message?: string;
}

async function requireAdminCtx(): Promise<
  { ok: true; userId: string } | { ok: false; error: AdminBlogResult["error"] }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.role !== "ADMIN") return { ok: false, error: "forbidden" };
  return { ok: true, userId: user.id };
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function revalidate(): void {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
}

/**
 * 記事の status 変更（運営: 全記事可）. 承認公開（DRAFT→PUBLISHED）、archive、
 * 差戻し（→DRAFT）等。SCHEDULED への変更はエディタ経由（publishAt が要るため）扱わない。
 */
export async function adminChangePostStatus(
  postId: string,
  next: string
): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const target = coercePostStatus(next);
  if (!target || target === "SCHEDULED") {
    return { ok: false, error: "invalid_transition" };
  }

  const existing = await db.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });
  if (!existing) return { ok: false, error: "not_found" };
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
  revalidate();
  revalidatePath(`/blog/${existing.slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// カテゴリ CRUD
// ---------------------------------------------------------------------------

export async function createBlogCategory(
  formData: FormData
): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const nameRaw = asString(formData.get("name")).trim();
  if (nameRaw.length < NAME_MIN || nameRaw.length > NAME_MAX) {
    return { ok: false, error: "validation", message: "名称を入力してください。" };
  }
  const slugInput = asString(formData.get("slug")).trim().toLowerCase();
  const slug = slugInput || slugify(nameRaw);
  if (!isValidSlug(slug)) {
    return { ok: false, error: "validation", message: "スラッグの形式が不正です。" };
  }
  const descRaw = asString(formData.get("description")).trim();

  const dup = await db.blogCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (dup) return { ok: false, error: "duplicate_slug", message: "そのスラッグは既に使われています。" };

  const maxOrder = await db.blogCategory.aggregate({ _max: { sortOrder: true } });
  await db.blogCategory.create({
    data: {
      slug,
      name: sanitizeText(nameRaw, NAME_MAX),
      description: descRaw ? sanitizeText(descRaw, DESC_MAX) : null,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });
  revalidate();
  return { ok: true };
}

export async function updateBlogCategory(
  categoryId: string,
  formData: FormData
): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const existing = await db.blogCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  const nameRaw = asString(formData.get("name")).trim();
  if (nameRaw.length < NAME_MIN || nameRaw.length > NAME_MAX) {
    return { ok: false, error: "validation", message: "名称を入力してください。" };
  }
  const descRaw = asString(formData.get("description")).trim();

  // slug は SEO 安定のため更新不可（カテゴリページ URL を保つ）。名称/説明のみ更新。
  await db.blogCategory.update({
    where: { id: existing.id },
    data: {
      name: sanitizeText(nameRaw, NAME_MAX),
      description: descRaw ? sanitizeText(descRaw, DESC_MAX) : null,
    },
  });
  revalidate();
  return { ok: true };
}

export async function deleteBlogCategory(
  categoryId: string
): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const count = await db.blogPost.count({ where: { categoryId } });
  if (count > 0) {
    return {
      ok: false,
      error: "in_use",
      message: `このカテゴリには ${count} 件の記事があります。削除できません。`,
    };
  }
  const existing = await db.blogCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  await db.blogCategory.delete({ where: { id: existing.id } });
  revalidate();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// タグ CRUD
// ---------------------------------------------------------------------------

export async function createBlogTag(formData: FormData): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const nameRaw = asString(formData.get("name")).trim();
  if (nameRaw.length < NAME_MIN || nameRaw.length > NAME_MAX) {
    return { ok: false, error: "validation", message: "名称を入力してください。" };
  }
  const slugInput = asString(formData.get("slug")).trim().toLowerCase();
  const slug = slugInput || slugify(nameRaw);
  if (!isValidSlug(slug)) {
    return { ok: false, error: "validation", message: "スラッグの形式が不正です。" };
  }

  const dup = await db.blogTag.findUnique({ where: { slug }, select: { id: true } });
  if (dup) return { ok: false, error: "duplicate_slug", message: "そのスラッグは既に使われています。" };

  await db.blogTag.create({
    data: { slug, name: sanitizeText(nameRaw, NAME_MAX) },
  });
  revalidate();
  return { ok: true };
}

export async function updateBlogTag(
  tagId: string,
  formData: FormData
): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const existing = await db.blogTag.findUnique({
    where: { id: tagId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  const nameRaw = asString(formData.get("name")).trim();
  if (nameRaw.length < NAME_MIN || nameRaw.length > NAME_MAX) {
    return { ok: false, error: "validation", message: "名称を入力してください。" };
  }
  await db.blogTag.update({
    where: { id: existing.id },
    data: { name: sanitizeText(nameRaw, NAME_MAX) },
  });
  revalidate();
  return { ok: true };
}

export async function deleteBlogTag(tagId: string): Promise<AdminBlogResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const count = await db.blogPostTag.count({ where: { tagId } });
  if (count > 0) {
    return {
      ok: false,
      error: "in_use",
      message: `このタグは ${count} 件の記事に使われています。削除できません。`,
    };
  }
  const existing = await db.blogTag.findUnique({
    where: { id: tagId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "not_found" };

  await db.blogTag.delete({ where: { id: existing.id } });
  revalidate();
  return { ok: true };
}
