/**
 * 結合テスト用 DB ヘルパ（実 DB :5433）.
 *
 * - テスト専用の PrismaClient（@/lib/db の singleton とは別接続でもよいが、
 *   同一 DATABASE_URL を指すため同じデータを見る）。
 * - baseline スナップショット取得 + 後始末後の検証（leftover 0 を保証）。
 *
 * baseline（seed 後）: posts 6 / advisors 16 / services 32 / requests 0 / notifications 0。
 */
import { PrismaClient } from "@prisma/client";

export const testDb = new PrismaClient();

export interface DbSnapshot {
  posts: number;
  advisors: number;
  services: number;
  requests: number;
  notifications: number;
  preferredSlots: number;
  favorites: number;
}

export async function snapshot(): Promise<DbSnapshot> {
  const [
    posts,
    advisors,
    services,
    requests,
    notifications,
    preferredSlots,
    favorites,
  ] = await Promise.all([
    testDb.blogPost.count(),
    testDb.fortuneTellerProfile.count(),
    testDb.service.count(),
    testDb.consultationRequest.count(),
    testDb.notification.count(),
    testDb.consultationPreferredSlot.count(),
    testDb.favorite.count(),
  ]);
  return {
    posts,
    advisors,
    services,
    requests,
    notifications,
    preferredSlots,
    favorites,
  };
}

/** 期待 baseline（mutable な行が 0 であること）。 */
export const BASELINE = {
  posts: 6,
  advisors: 16,
  services: 32,
  requests: 0,
  notifications: 0,
} as const;
