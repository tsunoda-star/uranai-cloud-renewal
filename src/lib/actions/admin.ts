"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * 最小 Admin Server Action（spec §3: ユーザー/占い師管理。ブログ管理は W5）.
 *
 * 不変条件:
 * - RBAC (SEC-2): ADMIN のみ。それ以外は forbidden。クライアント制御に依存しない。
 * - 自分自身の無効化は禁止（運営ロックアウト防止）。
 * - 占い師の公開トグルは FortuneTellerProfile.isPublished を更新（検索/一覧の可視性に直結）。
 */

export interface AdminMutationResult {
  ok: boolean;
  error?: "unauthenticated" | "forbidden" | "not_found" | "self_forbidden";
}

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: AdminMutationResult["error"] }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };
  if (user.role !== "ADMIN") return { ok: false, error: "forbidden" };
  return { ok: true, userId: user.id };
}

/** ユーザーの有効/無効トグル（ADMIN のみ）。自分自身は無効化不可。 */
export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<AdminMutationResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (userId === ctx.userId && !isActive) {
    return { ok: false, error: "self_forbidden" };
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  await db.user.update({ where: { id: target.id }, data: { isActive } });
  revalidatePath("/admin");
  return { ok: true };
}

/** 占い師プロフィールの公開/非公開トグル（ADMIN のみ）。 */
export async function setAdvisorPublished(
  advisorProfileId: string,
  isPublished: boolean
): Promise<AdminMutationResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const target = await db.fortuneTellerProfile.findUnique({
    where: { id: advisorProfileId },
    select: { id: true },
  });
  if (!target) return { ok: false, error: "not_found" };

  await db.fortuneTellerProfile.update({
    where: { id: target.id },
    data: { isPublished },
  });
  revalidatePath("/admin");
  return { ok: true };
}
