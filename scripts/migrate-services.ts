#!/usr/bin/env tsx
/**
 * スクレイプ済み JSON (/tmp/uranai-services.json) → Service モデル投入。
 *
 * - 占い師の紐付けは FortuneTellerProfile.slug = `legacy-${advisorUserId}` で照合
 * - カテゴリは categoryName → DivinationCategorySlug enum 経由で DivinationCategory.id
 * - 不足必須項目はデフォルト or スキップ:
 *     priceJpy null → SKIP
 *     advisor not found → SKIP
 *     method null → CHAT (warning)
 *     durationMin null → 30 (warning)
 * - 冪等: 占い師 + タイトル の組合せで重複検出（同タイトル再import は update）
 *
 * 実行:
 *   set -a && . ./.env.local && set +a
 *   DIRECT_URL="$DATABASE_URL_UNPOOLED" DATABASE_URL="$DATABASE_URL" \
 *     npx tsx scripts/migrate-services.ts
 */

import fs from "fs";
import {
  PrismaClient,
  ConsultationMethod,
  DivinationCategorySlug,
} from "@prisma/client";

const INPUT = "/tmp/uranai-services.json";

interface ScrapedService {
  itemId: number;
  title: string;
  description: string;
  priceJpy: number | null;
  durationMin: number | null;
  method: string | null;
  advisorUserId: number | null;
  advisorName: string | null;
  categoryName: string | null;
  rawDurationText: string | null;
  rawMethodText: string | null;
}

// カテゴリ表記 → enum
const CATEGORY_MAP: Record<string, DivinationCategorySlug> = {
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
  風水: "FENG_SHUI",
  姓名判断: "NAME_DIVINATION",
  易: "EKI",
  算命学: "SANMEI",
  "人相・顔相": "PHYSIOGNOMY",
  人相: "PHYSIOGNOMY",
  六星占術: "SIX_STAR",
  マヤ暦: "OTHER",
};

function normalize(s: string): string {
  return s.replace(/⻄/g, "西").trim();
}

function mapMethod(raw: string | null): ConsultationMethod {
  switch (raw) {
    case "PHONE":
      return "PHONE";
    case "CHAT":
      return "CHAT";
    case "EMAIL":
      return "EMAIL";
    case "ZOOM":
      return "ZOOM";
    case "IN_PERSON":
      return "IN_PERSON";
    default:
      return "CHAT"; // フォールバック
  }
}

async function main() {
  const prisma = new PrismaClient();
  const services: ScrapedService[] = JSON.parse(
    fs.readFileSync(INPUT, "utf8")
  );
  console.log(`▶ scraped services: ${services.length}`);

  // DivinationCategory id 引きキャッシュ
  const cats = await prisma.divinationCategory.findMany({
    select: { id: true, slug: true },
  });
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  const otherId = catIdBySlug.get("OTHER")!;
  if (!otherId) {
    console.error("OTHER DivinationCategory not seeded");
    process.exit(1);
  }

  let imported = 0,
    skipped = 0,
    failed = 0;
  const skipReasons = new Map<string, number>();

  for (const s of services) {
    const reason = (k: string) => {
      skipReasons.set(k, (skipReasons.get(k) ?? 0) + 1);
    };

    if (!s.priceJpy) {
      skipped++;
      reason("price_null");
      continue;
    }
    if (!s.advisorUserId) {
      skipped++;
      reason("advisor_id_null");
      continue;
    }

    const advisorSlug = `legacy-${s.advisorUserId}`;
    const advisor = await prisma.fortuneTellerProfile.findUnique({
      where: { slug: advisorSlug },
      select: { id: true },
    });
    if (!advisor) {
      skipped++;
      reason("advisor_not_in_db");
      continue;
    }

    // カテゴリ判定: スクレイプ値 → enum → DivinationCategory.id
    let categoryId = otherId;
    const catName = s.categoryName ? normalize(s.categoryName) : null;
    if (catName && CATEGORY_MAP[catName]) {
      const enumSlug = CATEGORY_MAP[catName];
      categoryId = catIdBySlug.get(enumSlug) ?? otherId;
    }

    const method = mapMethod(s.method);
    const durationMin = s.durationMin ?? 30;
    const title = (s.title ?? `鑑定 #${s.itemId}`).slice(0, 200);
    const description = (s.description ?? "").slice(0, 5000) || "(説明なし)";

    try {
      // 冪等性: advisor + title でユニーク扱い（厳密には schema 上の unique 制約は無いので findFirst）
      const existing = await prisma.service.findFirst({
        where: { advisorId: advisor.id, title },
        select: { id: true },
      });
      if (existing) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            description,
            method,
            priceJpy: s.priceJpy,
            durationMin,
            categoryId,
            isPublished: true,
          },
        });
      } else {
        await prisma.service.create({
          data: {
            advisorId: advisor.id,
            categoryId,
            title,
            description,
            method,
            priceJpy: s.priceJpy,
            durationMin,
            isPublished: true,
          },
        });
      }
      imported++;
    } catch (e) {
      failed++;
      console.warn(
        `  ⚠ item ${s.itemId} fail: ${(e as Error).message.slice(0, 160)}`
      );
    }
  }

  console.log(`\n=== Migration done ===`);
  console.log(`  imported: ${imported}`);
  console.log(`  skipped : ${skipped}`);
  console.log(`  failed  : ${failed}`);
  if (skipReasons.size > 0) {
    console.log(`  skip reasons:`);
    for (const [k, v] of skipReasons) console.log(`    ${k}: ${v}`);
  }

  const totalDb = await prisma.service.count();
  console.log(`  Service total in DB: ${totalDb}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
