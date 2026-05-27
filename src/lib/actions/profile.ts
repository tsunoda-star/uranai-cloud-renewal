"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";

export interface ProfileActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"displayName", string>>;
  /** Set on success for an inline confirmation. */
  saved?: boolean;
}

const DISPLAY_NAME_MIN = 1;
const DISPLAY_NAME_MAX = 50;

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * 最小プロフィール編集（spec §3: GENERAL は「最小プロフィール」, AC-B8）.
 *
 * 自分の User 行のみ更新（getCurrentUser が解決した id で where 制約。クライアント
 * から id を受け取らない）。displayName のみを対象とし、サニタイズ + 長さ検証する。
 */
export async function updateMyProfile(
  _prev: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ログインが必要です。" };

  const raw = asString(formData.get("displayName")).trim();
  if (raw.length < DISPLAY_NAME_MIN) {
    return {
      ok: false,
      error: "入力内容を確認してください。",
      fieldErrors: { displayName: "表示名を入力してください。" },
    };
  }
  if (raw.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: "入力内容を確認してください。",
      fieldErrors: {
        displayName: `表示名は${DISPLAY_NAME_MAX}文字以内で入力してください。`,
      },
    };
  }

  const displayName = sanitizeText(raw, DISPLAY_NAME_MAX);

  await db.user.update({
    where: { id: user.id },
    data: { displayName },
  });

  revalidatePath("/mypage");
  return { ok: true, saved: true };
}
