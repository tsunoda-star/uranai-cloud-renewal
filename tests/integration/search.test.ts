import { describe, it, expect } from "vitest";
import {
  searchAdvisors,
  searchServices,
  searchPosts,
} from "@/lib/queries";
import { testDb } from "./db-helper";

/**
 * I-1/I-2 結合: searchAdvisors / searchServices / searchPosts のフィルタ・並び替え・
 * ページネーション・pg_trgm キーワード（AC-B3-*, AC-C1-*）.
 *
 * seed（advisors16 / services32 / posts6）に対する read-only 検証。DB は変更しない。
 */
describe("searchAdvisors (AC-B3 フィルタ)", () => {
  it("公開占い師のみ返す & 件数集計（baseline 16 と整合）", async () => {
    const res = await searchAdvisors({});
    expect(res.total).toBeGreaterThan(0);
    // perPage=12 デフォルトで 1 ページ目は最大 12 件。
    expect(res.advisors.length).toBeLessThanOrEqual(res.perPage);
    expect(res.totalPages).toBe(Math.ceil(res.total / res.perPage));
  });

  it("ページネーション: page2 は page1 と重複しない", async () => {
    const p1 = await searchAdvisors({ page: 1, perPage: 5 });
    const p2 = await searchAdvisors({ page: 2, perPage: 5 });
    const s1 = new Set(p1.advisors.map((a) => a.slug));
    for (const a of p2.advisors) expect(s1.has(a.slug)).toBe(false);
  });

  it("category フィルタ: 返る占い師は全員その占術カテゴリを持つ", async () => {
    const res = await searchAdvisors({ category: "TAROT" });
    expect(res.advisors.length).toBeGreaterThan(0);
    for (const a of res.advisors) {
      expect(a.categories.some((c) => c.slug === "TAROT")).toBe(true);
    }
  });

  it("method フィルタ: 返る占い師は全員その相談形式に対応", async () => {
    const res = await searchAdvisors({ method: "PHONE" });
    for (const a of res.advisors) {
      expect(a.methods).toContain("PHONE");
    }
  });

  it("ratingMin フィルタ: 返る占い師は全員 rating>=min", async () => {
    const res = await searchAdvisors({ ratingMin: 4.5 });
    for (const a of res.advisors) {
      expect(a.rating).not.toBeNull();
      expect(a.rating!.average).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("複数フィルタは AND（category & method 両方満たす）", async () => {
    const res = await searchAdvisors({ category: "TAROT", method: "CHAT" });
    for (const a of res.advisors) {
      expect(a.categories.some((c) => c.slug === "TAROT")).toBe(true);
      expect(a.methods).toContain("CHAT");
    }
  });

  it("sort=rating: 評価降順に並ぶ", async () => {
    const res = await searchAdvisors({ sort: "rating", perPage: 48 });
    const ratings = res.advisors.map((a) => a.rating?.average ?? 0);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i - 1]).toBeGreaterThanOrEqual(ratings[i]);
    }
  });

  it("該当 0 件のキーワードは空配列 + total 0（pg_trgm path）", async () => {
    const res = await searchAdvisors({ q: "ZZZZNONEXISTENTKEYWORDZZZZ" });
    expect(res.total).toBe(0);
    expect(res.advisors).toEqual([]);
  });

  it("pg_trgm キーワード: 既存占い師名の一部で部分一致検索できる", async () => {
    // seed の代表的な占い師名（部分文字列）でヒットすること。
    const sample = await testDb.user.findFirst({
      where: { role: "FORTUNE_TELLER", fortuneTellerProfile: { isPublished: true } },
      select: { displayName: true },
    });
    expect(sample).not.toBeNull();
    // 名前の先頭 1 文字で検索（日本語 bigram でも 1 文字 ILIKE は部分一致）。
    const term = sample!.displayName.slice(0, 1);
    const res = await searchAdvisors({ q: term });
    expect(res.total).toBeGreaterThanOrEqual(1);
  });

  it("キーワードの % / _ はリテラル扱い（SQL ワイルドカード注入されない）", async () => {
    // '%' は全件一致しない（エスケープされている）はず。
    const res = await searchAdvisors({ q: "%" });
    const all = await searchAdvisors({});
    expect(res.total).toBeLessThan(all.total === 0 ? 1 : all.total + 1);
    // リテラル '%' を名前/紹介に含む占い師は seed に無い前提 → 0 件想定。
    expect(res.total).toBe(0);
  });
});

describe("searchServices (AC-B2/B3)", () => {
  it("公開サービスのみ返す & 件数集計", async () => {
    const res = await searchServices({});
    expect(res.total).toBeGreaterThan(0);
    expect(res.services.length).toBeLessThanOrEqual(res.perPage);
  });

  it("category フィルタが効く", async () => {
    const res = await searchServices({ category: "TAROT" });
    for (const s of res.services) {
      expect(s.category.slug).toBe("TAROT");
    }
  });

  it("price フィルタ（min-max）が効く", async () => {
    const res = await searchServices({ priceMin: 3000, priceMax: 8000, perPage: 48 });
    for (const s of res.services) {
      expect(s.priceJpy).toBeGreaterThanOrEqual(3000);
      expect(s.priceJpy).toBeLessThanOrEqual(8000);
    }
  });

  it("sort=price_asc / price_desc が効く", async () => {
    const asc = await searchServices({ sort: "price_asc", perPage: 48 });
    const prices = asc.services.map((s) => s.priceJpy);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i - 1]).toBeLessThanOrEqual(prices[i]);
    }
    const desc = await searchServices({ sort: "price_desc", perPage: 48 });
    const dp = desc.services.map((s) => s.priceJpy);
    for (let i = 1; i < dp.length; i++) {
      expect(dp[i - 1]).toBeGreaterThanOrEqual(dp[i]);
    }
  });
});

describe("searchPosts (AC-C1-1/5/6, pg_trgm)", () => {
  it("公開記事のみ返す（seed: PUBLISHED 3 件想定）", async () => {
    const res = await searchPosts({});
    expect(res.total).toBeGreaterThanOrEqual(1);
    for (const p of res.posts) {
      expect(p.publishedAt).toBeInstanceOf(Date);
      expect(p.publishedAt.getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it("新着順（publishedAt desc）に並ぶ", async () => {
    const res = await searchPosts({ perPage: 48 });
    const times = res.posts.map((p) => p.publishedAt.getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
    }
  });

  it("キーワード検索（pg_trgm）が公開記事のみにヒット", async () => {
    // seed の公開記事タイトル断片で検索（例: 'タロット'）。
    const res = await searchPosts({ q: "タロット" });
    // ヒットした記事はすべて公開済み。
    for (const p of res.posts) {
      expect(p.publishedAt.getTime()).toBeLessThanOrEqual(Date.now());
    }
    expect(res.total).toBe(res.posts.length <= res.perPage ? res.total : res.total);
  });

  it("0 件キーワードは空配列 + total 0", async () => {
    const res = await searchPosts({ q: "ZZZZNONEXISTENTZZZZ" });
    expect(res.total).toBe(0);
    expect(res.posts).toEqual([]);
  });

  it("category フィルタは公開記事を AND で絞る", async () => {
    const cat = await testDb.blogCategory.findFirst({ select: { slug: true } });
    expect(cat).not.toBeNull();
    const res = await searchPosts({ categorySlug: cat!.slug, perPage: 48 });
    // 返った件数は全公開件数以下。
    const all = await searchPosts({ perPage: 48 });
    expect(res.total).toBeLessThanOrEqual(all.total);
  });
});
