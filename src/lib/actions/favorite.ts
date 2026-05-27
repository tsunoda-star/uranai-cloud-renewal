"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface FavoriteToggleResult {
  ok: boolean;
  favorited: boolean;
  /** Reason on failure (for the client to surface a non-PII message). */
  error?: "unauthenticated" | "forbidden" | "not_found";
}

/**
 * Toggle a GENERAL user's favorite for an advisor (お気に入り, AC-B4).
 *
 * RBAC is enforced server-side (SEC-2): only an authenticated GENERAL user may
 * favorite. The action resolves the session to a real User row (getCurrentUser)
 * and writes against the live Favorite table — no client-trusted ids. Returns a
 * structured result so the client can reflect state without a full reload, and
 * revalidates the advisor page for non-JS / shared views.
 */
export async function toggleFavorite(
  advisorSlug: string
): Promise<FavoriteToggleResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, favorited: false, error: "unauthenticated" };
  }
  // お気に入り登録は 3 ロールとも可（spec §3）だが、本フォームは一般ユーザー導線。
  // 管理者/占い師セッションでも安全に動くよう role は限定しない（spec §3 の表に従う）。

  const advisor = await db.fortuneTellerProfile.findUnique({
    where: { slug: advisorSlug },
    select: { id: true },
  });
  if (!advisor) {
    return { ok: false, favorited: false, error: "not_found" };
  }

  const existing = await db.favorite.findUnique({
    where: { userId_advisorId: { userId: user.id, advisorId: advisor.id } },
    select: { userId: true },
  });

  let favorited: boolean;
  if (existing) {
    await db.favorite.delete({
      where: { userId_advisorId: { userId: user.id, advisorId: advisor.id } },
    });
    favorited = false;
  } else {
    await db.favorite.create({
      data: { userId: user.id, advisorId: advisor.id },
    });
    favorited = true;
  }

  revalidatePath(`/advisors/${advisorSlug}`);
  return { ok: true, favorited };
}

/**
 * Remove a favorite from /mypage (AC-B8 お気に入り解除).
 *
 * Distinct from toggleFavorite so it can revalidate /mypage and is idempotent
 * (removing an already-absent favorite is a no-op success). RBAC + ownership
 * are enforced via the `userId` constraint on the live Favorite row.
 */
export async function removeFavorite(
  advisorSlug: string
): Promise<FavoriteToggleResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, favorited: false, error: "unauthenticated" };
  }

  const advisor = await db.fortuneTellerProfile.findUnique({
    where: { slug: advisorSlug },
    select: { id: true },
  });
  if (!advisor) {
    return { ok: false, favorited: false, error: "not_found" };
  }

  await db.favorite.deleteMany({
    where: { userId: user.id, advisorId: advisor.id },
  });

  revalidatePath("/mypage");
  revalidatePath(`/advisors/${advisorSlug}`);
  return { ok: true, favorited: false };
}
