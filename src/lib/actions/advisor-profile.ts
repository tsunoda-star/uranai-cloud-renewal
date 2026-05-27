"use server";

import { revalidatePath } from "next/cache";
import type { ConsultationMethod, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

/**
 * 占い師プロフィール管理 Server Action（AC-B9-1, spec §3）.
 *
 * 不変条件:
 * - RBAC (SEC-2): FORTUNE_TELLER / ADMIN のみ。
 * - 所有権 (SEC-3): 自分の FortuneTellerProfile のみ更新（getCurrentUser の id で where 制約）。
 *   クライアントから advisorId を受け取らない。
 * - bio / experience はサニタイズ + 長さ検証（SEC-5）。photoUrl は http(s) のみ許可。
 * - 得意占術（AdvisorCategory, 主占術フラグ）/ 対応相談形式（AdvisorMethod）/ isPublished を
 *   トランザクションで同期（差分 delete/create）。
 */

const BIO_MIN = 20;
const BIO_MAX = 2000;
const EXPERIENCE_MAX = 1000;

const VALID_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

export interface AdvisorProfileActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<"bio" | "experience" | "photoUrl" | "categories" | "methods", string>
  >;
  saved?: boolean;
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/** Validate an http(s) absolute URL; return null when invalid/empty. */
function parseHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export async function updateAdvisorProfile(
  _prev: AdvisorProfileActionState,
  formData: FormData
): Promise<AdvisorProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };
  if (user.role !== "FORTUNE_TELLER" && user.role !== "ADMIN") {
    return { ok: false, error: "この操作を行う権限がありません。" };
  }

  // 自分のプロフィールのみ（SEC-3）。
  const profile = await db.fortuneTellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return {
      ok: false,
      error:
        "占い師プロフィールが未作成です。先に占い師登録を完了してください。",
    };
  }

  const fieldErrors: AdvisorProfileActionState["fieldErrors"] = {};

  // bio
  const bioRaw = asString(formData.get("bio"));
  const bioLen = bioRaw.trim().length;
  if (bioLen < BIO_MIN) {
    fieldErrors.bio = `自己紹介は${BIO_MIN}文字以上で入力してください。`;
  } else if (bioLen > BIO_MAX) {
    fieldErrors.bio = `自己紹介は${BIO_MAX}文字以内で入力してください。`;
  }

  // experience（任意）
  const experienceRaw = asString(formData.get("experience"));
  if (experienceRaw.trim().length > EXPERIENCE_MAX) {
    fieldErrors.experience = `活動実績は${EXPERIENCE_MAX}文字以内で入力してください。`;
  }

  // photoUrl（任意, http(s)）
  const photoUrlRaw = asString(formData.get("photoUrl"));
  let photoUrl: string | null = null;
  if (photoUrlRaw.trim()) {
    photoUrl = parseHttpUrl(photoUrlRaw);
    if (!photoUrl) {
      fieldErrors.photoUrl = "画像URLは http(s) で始まる正しいURLを入力してください。";
    }
  }

  // categories: form values "categoryId" (multi). primaryCategoryId は単一。
  const selectedCategoryIds = formData
    .getAll("categoryId")
    .map((v) => (typeof v === "string" ? v : ""))
    .filter(Boolean);
  const primaryCategoryId = asString(formData.get("primaryCategoryId")).trim();
  if (selectedCategoryIds.length === 0) {
    fieldErrors.categories = "得意な占術を1つ以上選択してください。";
  }

  // methods: form values "method" (multi)
  const selectedMethodsRaw = formData
    .getAll("method")
    .map((v) => (typeof v === "string" ? v.toUpperCase() : ""))
    .filter((v): v is ConsultationMethod =>
      (VALID_METHODS as readonly string[]).includes(v)
    );
  const selectedMethods = Array.from(new Set(selectedMethodsRaw));
  if (selectedMethods.length === 0) {
    fieldErrors.methods = "対応する相談形式を1つ以上選択してください。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "入力内容を確認してください。", fieldErrors };
  }

  // 選択カテゴリの実在検証（client 値を信頼しない）。
  const validCategories = await db.divinationCategory.findMany({
    where: { id: { in: selectedCategoryIds } },
    select: { id: true },
  });
  const validCategoryIds = new Set(validCategories.map((c) => c.id));
  const categoryIds = selectedCategoryIds.filter((id) =>
    validCategoryIds.has(id)
  );
  if (categoryIds.length === 0) {
    return {
      ok: false,
      error: "入力内容を確認してください。",
      fieldErrors: { categories: "得意な占術を1つ以上選択してください。" },
    };
  }
  // 主占術: 選択集合内のもの。なければ先頭を主占術にする。
  const primaryId = categoryIds.includes(primaryCategoryId)
    ? primaryCategoryId
    : categoryIds[0];

  const bio = sanitizeText(bioRaw, BIO_MAX);
  const experience = experienceRaw.trim()
    ? sanitizeText(experienceRaw, EXPERIENCE_MAX)
    : null;
  const isPublished = formData.get("isPublished") === "on";

  await db.$transaction(async (tx) => {
    await tx.fortuneTellerProfile.update({
      where: { id: profile.id },
      data: { bio, experience, photoUrl, isPublished },
    });

    // categories: 全削除して再作成（差分管理を単純化, 件数は最大15で安全）。
    await tx.advisorCategory.deleteMany({ where: { advisorId: profile.id } });
    await tx.advisorCategory.createMany({
      data: categoryIds.map(
        (categoryId): Prisma.AdvisorCategoryCreateManyInput => ({
          advisorId: profile.id,
          categoryId,
          isPrimary: categoryId === primaryId,
        })
      ),
    });

    // methods: 全削除して再作成。
    await tx.advisorMethod.deleteMany({ where: { advisorId: profile.id } });
    await tx.advisorMethod.createMany({
      data: selectedMethods.map(
        (method): Prisma.AdvisorMethodCreateManyInput => ({
          advisorId: profile.id,
          method,
        })
      ),
    });
  });

  revalidatePath("/advisor/profile");
  revalidatePath("/advisor");
  return { ok: true, saved: true };
}
