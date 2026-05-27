"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export interface MarkReadResult {
  ok: boolean;
  error?: "unauthenticated";
}

/**
 * 通知の既読化（AC-B7-6）.
 *
 * 所有権はクエリの `userId` 制約で保証（自分の通知のみ更新可, SEC-3）。
 * 単一 id 指定 or 全件のいずれか。クライアントから渡る id を信頼せず、
 * 必ず `userId === 現在ユーザー` で絞り込む。
 */
export async function markNotificationRead(
  notificationId: string
): Promise<MarkReadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  await db.notification.updateMany({
    where: { id: notificationId, userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/mypage");
  return { ok: true };
}

/** Mark all of the current user's notifications as read. */
export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/mypage");
  return { ok: true };
}
