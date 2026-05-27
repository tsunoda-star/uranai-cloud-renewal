#!/usr/bin/env tsx
/**
 * matchingcloud (www.uranai.cloud) の鑑定メニューを Playwright でスクレイピング。
 *
 * - /items?page=N で全 item ID 収集（page 1 + 2 = 59 件想定）
 * - 各 /items/{id} を Chromium で完全描画 → title / description / priceJpy /
 *   durationMin / method / advisor user_id / category を抽出
 * - 出力: /tmp/uranai-services.json
 *
 * 実行: npx tsx scripts/scrape-services.ts
 */

import fs from "fs";
import { chromium, Browser, Page } from "@playwright/test";

const BASE = "https://www.uranai.cloud";
const OUT_PATH = "/tmp/uranai-services.json";
const NAV_TIMEOUT = 30_000;
const RATE_LIMIT_MS = 1500; // /items/{id} 間の最小間隔（サイト負荷配慮）

interface ServiceRow {
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

async function collectItemIds(page: Page): Promise<number[]> {
  const ids = new Set<number>();
  for (let p = 1; p <= 5; p++) {
    await page.goto(`${BASE}/items?page=${p}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });
    await page.waitForTimeout(1500);
    const linkIds = await page.$$eval('a[href^="/items/"]', function (links) {
      return links
        .map(function (a) {
          return (a as HTMLAnchorElement).getAttribute("href") || "";
        })
        .map(function (h) {
          var m = h.match(/^\/items\/(\d+)$/);
          return m ? m[1] : null;
        })
        .filter(function (x) {
          return Boolean(x);
        });
    });
    const before = ids.size;
    for (const id of linkIds) if (id) ids.add(Number(id));
    const added = ids.size - before;
    console.log(`  /items?page=${p}: +${added} (total ${ids.size})`);
    if (added === 0) break;
  }
  return Array.from(ids).sort((a, b) => a - b);
}

async function scrapeItem(
  page: Page,
  id: number
): Promise<ServiceRow | null> {
  try {
    await page.goto(`${BASE}/items/${id}`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT,
    });
    await page
      .locator(".mc-item_price_price-value")
      .first()
      .waitFor({ timeout: 10_000 })
      .catch(() => {});
    // JS hydration 安定化
    await page.waitForTimeout(1500);

    const data = await page.evaluate(function () {
      function q(sel: string): string {
        var el = document.querySelector(sel);
        return el && el.textContent ? el.textContent.trim() : "";
      }
      function attr(sel: string, name: string): string | null {
        var el = document.querySelector(sel);
        return el ? el.getAttribute(name) : null;
      }
      var bodyText = document.body.innerText;

      // ラベル直後の最初のセル値（| 区切りで現れる）。
      // bodyText は表組レイアウトでも改行 + " | " で分かれていることが多いので
      // ラベル直後 1〜2 行を見るのが堅実。
      function valueAfter(label: string): string | null {
        var re = new RegExp(label + "\\s*[\\|｜]?\\s*\\n?\\s*([^\\n\\|｜]{1,80})");
        var m = bodyText.match(re);
        return m && m[1] ? m[1].trim() : null;
      }

      var title = q("h1") || document.title.split("|")[0].trim();
      var description =
        attr('meta[name="description"]', "content") || "";

      // 価格
      var priceTxt = q(".mc-item_price_price-value");
      var priceJpy = priceTxt
        ? parseInt(priceTxt.replace(/[^\d]/g, ""), 10) || null
        : null;

      // 所要時間 (例: "1時間", "60分", "30分")
      var rawDurationText = valueAfter("時間");
      var durationMin: number | null = null;
      if (rawDurationText) {
        var mh = rawDurationText.match(/(\d+)\s*時間/);
        var mm = rawDurationText.match(/(\d+)\s*分/);
        if (mh) durationMin = (durationMin || 0) + Number(mh[1]) * 60;
        if (mm) durationMin = (durationMin || 0) + Number(mm[1]);
      }

      // 占い方法
      var rawMethodText = valueAfter("占い方法") || valueAfter("鑑定方法") || valueAfter("相談方法");
      var method: string | null = null;
      if (rawMethodText) {
        var t = rawMethodText;
        if (t.indexOf("電話") >= 0) method = "PHONE";
        else if (t.indexOf("Zoom") >= 0 || t.indexOf("ビデオ") >= 0) method = "ZOOM";
        else if (t.indexOf("チャット") >= 0) method = "CHAT";
        else if (t.indexOf("メール") >= 0) method = "EMAIL";
        else if (t.indexOf("対面") >= 0) method = "IN_PERSON";
        else if (t.indexOf("オンライン") >= 0) method = "ZOOM"; // 汎用「オンライン」は ZOOM 扱い
      }

      // カテゴリ (例: "カテゴリ | 数秘術")
      var rawCategory = valueAfter("カテゴリ");

      // 占い師プロフィール名
      var advisorName = q(".mc-profile_name") || null;

      // 占い師 user_id: ページ内 /users/{id} リンクの先頭（advisor card 内）
      var advisorUserId: number | null = null;
      var userLinks = document.querySelectorAll('a[href^="/users/"]');
      for (var i = 0; i < userLinks.length; i++) {
        var h = (userLinks[i] as HTMLAnchorElement).getAttribute("href") || "";
        var m = h.match(/^\/users\/(\d+)/);
        if (m) {
          advisorUserId = Number(m[1]);
          break;
        }
      }

      return {
        title: title,
        description: description,
        priceJpy: priceJpy,
        durationMin: durationMin,
        method: method,
        advisorUserId: advisorUserId,
        advisorName: advisorName,
        categoryName: rawCategory,
        rawDurationText: rawDurationText,
        rawMethodText: rawMethodText,
      };
    });

    return { itemId: id, ...data };
  } catch (e) {
    console.warn(`  ⚠ item ${id} failed: ${(e as Error).message.slice(0, 120)}`);
    return null;
  }
}

async function main() {
  const browser: Browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0",
    locale: "ja-JP",
  });
  // tsx の transpile が page.evaluate に持ち込む __name シンボルをブラウザ側で no-op 定義
  await ctx.addInitScript("window.__name = function(fn){return fn;};");
  const page = await ctx.newPage();

  console.log("▶ collecting item IDs …");
  const ids = await collectItemIds(page);
  console.log(`✓ collected ${ids.length} item IDs`);

  const results: ServiceRow[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    process.stdout.write(`  [${i + 1}/${ids.length}] /items/${id} … `);
    const row = await scrapeItem(page, id);
    if (row) {
      results.push(row);
      console.log(
        `OK ¥${row.priceJpy ?? "?"} ${row.durationMin ?? "?"}分 ${row.method ?? "?"} → user ${row.advisorUserId ?? "?"}`
      );
    } else {
      console.log("FAIL");
    }
    if (i < ids.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✓ wrote ${results.length} services → ${OUT_PATH}`);
  await browser.close();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
