#!/usr/bin/env tsx
/**
 * 占い師 + ユーザー移管スクリプト（matchingcloud CSV エクスポート → Prisma）
 *
 * 入力: /tmp/uranai-advisors.json, /tmp/uranai-users.json
 *   （scripts/numbers-to-json.py で .numbers → JSON 変換した出力）
 *
 * 投入対象:
 *   - DivinationCategory: 全 15 enum slug を upsert（seed 済みなら no-op）
 *   - User (role=GENERAL): ユーザー CSV 全件
 *   - User (role=FORTUNE_TELLER) + FortuneTellerProfile + AdvisorCategory: 占い師 CSV 全件
 *
 * 冪等: メアド + アカウント番号で upsert。再実行 OK。
 *
 * 実行:
 *   python3 scripts/numbers-to-json.py
 *   set -a && . ./.env.local && set +a
 *   DIRECT_URL="$DATABASE_URL_UNPOOLED" DATABASE_URL="$DATABASE_URL" \
 *     npx tsx scripts/migrate-advisors.ts
 */

import fs from "fs";
import {
  PrismaClient,
  UserRole,
  DivinationCategorySlug,
} from "@prisma/client";

const ADVISORS_JSON = "/tmp/uranai-advisors.json";
const USERS_JSON = "/tmp/uranai-users.json";

interface AdvisorRow {
  アカウント番号: string;
  メールアドレス: string;
  アカウント名: string;
  種別: string;
  プラン: string;
  登録日: string;
  ステータス: string;
  アイコン: string;
  カバー画像: string;
  本人確認済み: string;
  プロフィールURL: string;
  生年月日: string;
  年代: string;
  都道府県: string;
  性別: string;
  自己紹介: string;
  占術: string;
}

interface UserRow {
  アカウント番号: string;
  メールアドレス: string;
  アカウント名: string;
  種別: string;
  プラン: string;
  登録日: string;
  ステータス: string;
  アイコン: string;
  カバー画像: string;
  本人確認済み: string;
  プロフィールURL: string;
  生年月日: string;
  年代: string;
  性別: string;
  住所: string;
  自己紹介: string;
}

// 占術文字列 → DivinationCategorySlug 変換テーブル。
// 「⻄」(U+2F1A) は「西」(U+897F) に正規化済（normalizeTech）。
const TECH_TO_SLUG: Record<string, DivinationCategorySlug> = {
  タロット: "TAROT",
  スピリチュアル: "SPIRITUAL",
  その他: "OTHER",
  数秘術: "NUMEROLOGY",
  霊感占術: "SPIRITUAL_SENSE",
  西洋占星術: "WESTERN_ASTROLOGY",
  四柱推命: "FOUR_PILLARS",
  九星気学: "NINE_STAR_KI",
  手相: "PALMISTRY",
  "風水・方位学": "FENG_SHUI",
  姓名判断: "NAME_DIVINATION",
  易: "EKI",
  算命学: "SANMEI",
  "人相・顔相": "PHYSIOGNOMY",
  六星占術: "SIX_STAR",
  マヤ暦: "OTHER",
};

// DivinationCategorySlug → 日本語表示名（categoryName のため）。
const SLUG_TO_LABEL: Record<DivinationCategorySlug, string> = {
  TAROT: "タロット",
  PALMISTRY: "手相",
  FOUR_PILLARS: "四柱推命",
  NINE_STAR_KI: "九星気学",
  NUMEROLOGY: "数秘術",
  SPIRITUAL_SENSE: "霊感占術",
  FENG_SHUI: "風水・方位学",
  PHYSIOGNOMY: "人相・顔相",
  WESTERN_ASTROLOGY: "西洋占星術",
  SPIRITUAL: "スピリチュアル",
  SANMEI: "算命学",
  EKI: "易",
  NAME_DIVINATION: "姓名判断",
  SIX_STAR: "六星占術",
  OTHER: "その他",
};

function normalizeTech(s: string): string {
  // CJK Radical "WEST" U+2EC4 (⻄) を正規の 西 U+897F に正規化。matchingcloud 由来の文字化け対策。
  return s.replace(/⻄/g, "西").trim();
}

function splitTechs(raw: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/[、/|;]/g, ",")
    .split(",")
    .map(normalizeTech)
    .filter(Boolean);
}

function parseId(url: string): string | null {
  const m = url.match(/\/users\/(\d+)/);
  return m ? m[1] : null;
}

function fallbackEmail(role: "advisor" | "user", accountId: string): string {
  return `legacy-${role}-${accountId}@migrated.uranai.cloud`;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // ISO 文字列もしくは "YYYY/MM/DD" 形式。numbers-parser は datetime → isoformat。
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  const advisors: AdvisorRow[] = JSON.parse(
    fs.readFileSync(ADVISORS_JSON, "utf8")
  );
  const users: UserRow[] = JSON.parse(fs.readFileSync(USERS_JSON, "utf8"));

  console.log(`▶ migration start: advisors=${advisors.length} users=${users.length}`);

  // 1. DivinationCategory upsert（seed と同じ slug を使う）
  const categoryMap = new Map<DivinationCategorySlug, string>();
  for (const slug of Object.keys(SLUG_TO_LABEL) as DivinationCategorySlug[]) {
    const c = await prisma.divinationCategory.upsert({
      where: { slug },
      update: {},
      create: { slug, name: SLUG_TO_LABEL[slug] },
    });
    categoryMap.set(slug, c.id);
  }
  console.log(`✓ DivinationCategory: ${categoryMap.size}`);

  // 2. ユーザー (role=GENERAL)
  let uImported = 0,
    uSkipped = 0,
    uFailed = 0;
  for (const row of users) {
    try {
      const accountId = row.アカウント番号.trim();
      if (!accountId) {
        uSkipped++;
        continue;
      }
      const email = row.メールアドレス.trim() || fallbackEmail("user", accountId);
      const displayName = row.アカウント名.trim() || `ユーザー${accountId}`;
      const createdAt = parseDate(row.登録日) ?? new Date();
      const isActive = row.ステータス.trim() === "利用中";
      const avatarUrl = row.アイコン.trim() || null;

      await prisma.user.upsert({
        where: { email },
        update: { displayName, role: UserRole.GENERAL, isActive, avatarUrl },
        create: {
          email,
          displayName,
          role: UserRole.GENERAL,
          isActive,
          avatarUrl,
          createdAt,
        },
      });
      uImported++;
    } catch (e) {
      uFailed++;
      console.warn(
        `  ⚠ user fail #${row.アカウント番号}: ${(e as Error).message?.slice(0, 200)}`
      );
    }
  }
  console.log(
    `✓ users: imported=${uImported} skipped=${uSkipped} failed=${uFailed}`
  );

  // 3. 占い師 (role=FORTUNE_TELLER) + FortuneTellerProfile + AdvisorCategory
  let aImported = 0,
    aSkipped = 0,
    aFailed = 0;
  for (const row of advisors) {
    try {
      const accountId = row.アカウント番号.trim();
      if (!accountId) {
        aSkipped++;
        continue;
      }
      const userIdInUrl = parseId(row.プロフィールURL);
      const slug = `legacy-${userIdInUrl ?? accountId}`;
      const email =
        row.メールアドレス.trim() || fallbackEmail("advisor", accountId);
      const displayName = row.アカウント名.trim() || `占い師${accountId}`;
      const createdAt = parseDate(row.登録日) ?? new Date();
      const isActive = row.ステータス.trim() === "利用中";
      const avatarUrl = row.アイコン.trim() || null;
      const bio = row.自己紹介.trim() || "(プロフィール準備中)";

      // 占術 → enum slug 列
      const techs = splitTechs(row.占術);
      const seenSlugs = new Set<DivinationCategorySlug>();
      const categoryLinks: Array<{
        categoryId: string;
        isPrimary: boolean;
      }> = [];
      for (let i = 0; i < techs.length; i++) {
        const enumSlug = TECH_TO_SLUG[techs[i]];
        if (!enumSlug) continue;
        if (seenSlugs.has(enumSlug)) continue; // 重複 (例: その他 と マヤ暦 が両方 OTHER) は最初の1つだけ
        seenSlugs.add(enumSlug);
        const categoryId = categoryMap.get(enumSlug);
        if (!categoryId) continue;
        categoryLinks.push({
          categoryId,
          isPrimary: seenSlugs.size === 1, // 最初に出現した占術を primary に
        });
      }

      // User upsert
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          displayName,
          role: UserRole.FORTUNE_TELLER,
          isActive,
          avatarUrl,
        },
        create: {
          email,
          displayName,
          role: UserRole.FORTUNE_TELLER,
          isActive,
          avatarUrl,
          createdAt,
        },
      });

      // FortuneTellerProfile upsert（userId に対して 1:1）+ AdvisorCategory 全置換
      await prisma.$transaction(async (tx) => {
        const existing = await tx.fortuneTellerProfile.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (existing) {
          // AdvisorCategory を一度全削除 → 再構築（占術リストの差分管理を避ける）
          await tx.advisorCategory.deleteMany({
            where: { advisorId: existing.id },
          });
          await tx.fortuneTellerProfile.update({
            where: { id: existing.id },
            data: {
              slug,
              bio,
              photoUrl: avatarUrl,
              isPublished: isActive,
              categories: {
                create: categoryLinks.map((c) => ({
                  categoryId: c.categoryId,
                  isPrimary: c.isPrimary,
                })),
              },
            },
          });
        } else {
          await tx.fortuneTellerProfile.create({
            data: {
              userId: user.id,
              slug,
              bio,
              photoUrl: avatarUrl,
              isPublished: isActive,
              categories: {
                create: categoryLinks.map((c) => ({
                  categoryId: c.categoryId,
                  isPrimary: c.isPrimary,
                })),
              },
            },
          });
        }
      });
      aImported++;
    } catch (e) {
      aFailed++;
      console.warn(
        `  ⚠ advisor fail #${row.アカウント番号}: ${(e as Error).message?.slice(0, 200)}`
      );
    }
  }
  console.log(
    `✓ advisors: imported=${aImported} skipped=${aSkipped} failed=${aFailed}`
  );

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n=== Migration done in ${elapsed}s ===`);

  // 検証
  const usersTotal = await prisma.user.count({ where: { role: "GENERAL" } });
  const advisorsTotal = await prisma.user.count({
    where: { role: "FORTUNE_TELLER" },
  });
  const profileTotal = await prisma.fortuneTellerProfile.count();
  const linkTotal = await prisma.advisorCategory.count();
  console.log(`  Users role=GENERAL: ${usersTotal}`);
  console.log(`  Users role=FORTUNE_TELLER: ${advisorsTotal}`);
  console.log(`  FortuneTellerProfile: ${profileTotal}`);
  console.log(`  AdvisorCategory links: ${linkTotal}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
