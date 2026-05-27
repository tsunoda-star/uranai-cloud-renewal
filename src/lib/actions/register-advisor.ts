"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/auth/dev-gate";

/**
 * 占い師登録導線 Server Action（AC-A2-2, spec §3）.
 *
 * 設計（OPEN-2 CC-Auth 連携前提）:
 * - 本番: CC-Auth のロール付与が前提のため、ここでは「申請受付」までを担う骨子。
 *   ロール昇格そのものは CC-Auth 側ロールクレームの確定後に有効化する（dev では実行）。
 * - dev (ADR-3 二重ゲート): 現在ユーザーを FORTUNE_TELLER 化し、未作成なら
 *   FortuneTellerProfile を最小値で作成する（フル E2E を回せるようにするため）。
 *   この昇格は AUTH_PROVIDER=dev かつ NODE_ENV!=production のときのみ。
 *
 * 不変条件:
 * - 認証必須。既に占い師プロフィールがある場合は何もせず /advisor へ。
 * - slug は衝突しない一意値を生成。
 */

export interface RegisterAdvisorState {
  ok: boolean;
  error?: string;
  /** 本番骨子: 申請を受け付けた旨。 */
  applied?: boolean;
}

/** ASCII-safe な一意 slug を生成（"advisor-" + 短い乱英数字）。衝突時は再試行。 */
async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const rand = Math.random().toString(36).slice(2, 8);
    const candidate = `advisor-${rand}`;
    const exists = await db.fortuneTellerProfile.findUnique({
      where: { slug: candidate },
      select: { slug: true },
    });
    if (!exists) return candidate;
  }
  // 極端な衝突時のフォールバック（タイムスタンプ付与）。
  return `advisor-${Date.now().toString(36)}`;
}

/**
 * 占い師登録。dev では即時昇格 + プロフィール作成 → /advisor へ redirect。
 * 本番（CC-Auth 連携前）は申請受付 state を返す（昇格は連携後）。
 */
export async function registerAsAdvisor(
  _prev: RegisterAdvisorState,
  formData: FormData
): Promise<RegisterAdvisorState> {
  // 入力は不要だが useActionState の契約上 formData を受け取る。誤って大量データが
  // 送られた場合の早期検知のためサイズだけ参照する（PII は読まない）。
  void formData;

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  // 既に占い師プロフィールがある → ダッシュボードへ。
  const existing = await db.fortuneTellerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existing) {
    redirect("/advisor");
  }

  // 本番（CC-Auth 連携前）: 申請受付の骨子のみ（OPEN-2）。
  if (!isDevAuthEnabled()) {
    return {
      ok: true,
      applied: true,
    };
  }

  // dev: 昇格 + プロフィール作成（最小値。詳細はプロフィール管理で編集）。
  const slug = await generateUniqueSlug();
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { role: "FORTUNE_TELLER" },
    });
    await tx.fortuneTellerProfile.create({
      data: {
        userId: user.id,
        slug,
        bio: `${user.displayName}と申します。プロフィールを編集して自己紹介を充実させましょう。`,
        isPublished: false,
      },
    });
  });

  revalidatePath("/advisor");
  redirect("/advisor/profile?welcome=1");
}
