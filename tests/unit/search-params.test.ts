import { describe, it, expect } from "vitest";
import {
  parseCategorySlug,
  parseAdvisorParams,
  parseServiceParams,
  buildAdvisorQuery,
  buildServiceQuery,
} from "@/lib/search-params";

/**
 * 単体: URL searchParams → typed query params のパース/再シリアライズ（U-12, AC-B3-5/6）.
 * 寛容パース（不正値は「フィルタなし」へフォールバック、共有/リロードに頑健）。
 */
describe("parseCategorySlug", () => {
  it("小文字 slug を enum（大文字）に coerce", () => {
    expect(parseCategorySlug("tarot")).toBe("TAROT");
    expect(parseCategorySlug("WESTERN_ASTROLOGY")).toBe("WESTERN_ASTROLOGY");
  });
  it("未知 slug / undefined は undefined", () => {
    expect(parseCategorySlug("unknown")).toBeUndefined();
    expect(parseCategorySlug(undefined)).toBeUndefined();
    expect(parseCategorySlug("")).toBeUndefined();
  });
});

describe("parseAdvisorParams", () => {
  it("空 params はデフォルト（page=1, perPage=12, sort=recommended）", () => {
    const p = parseAdvisorParams({});
    expect(p.page).toBe(1);
    expect(p.perPage).toBe(12);
    expect(p.sort).toBe("recommended");
    expect(p.category).toBeUndefined();
    expect(p.method).toBeUndefined();
  });

  it("category/method/rating/price/q/sort/page を解釈", () => {
    const p = parseAdvisorParams({
      category: "tarot",
      method: "phone",
      rating: "4",
      price: "3000-8000",
      q: "  恋愛  ",
      sort: "rating",
      page: "3",
    });
    expect(p.category).toBe("TAROT");
    expect(p.method).toBe("PHONE");
    expect(p.ratingMin).toBe(4);
    expect(p.priceMin).toBe(3000);
    expect(p.priceMax).toBe(8000);
    expect(p.q).toBe("恋愛");
    expect(p.sort).toBe("rating");
    expect(p.page).toBe(3);
  });

  it("価格帯は片側だけでも解釈（min のみ / max のみ）", () => {
    expect(parseAdvisorParams({ price: "5000-" }).priceMin).toBe(5000);
    expect(parseAdvisorParams({ price: "5000-" }).priceMax).toBeUndefined();
    expect(parseAdvisorParams({ price: "-9000" }).priceMax).toBe(9000);
    expect(parseAdvisorParams({ price: "-9000" }).priceMin).toBeUndefined();
  });

  it("境界値: rating は 0<r<=5 のみ採用、範囲外は undefined", () => {
    expect(parseAdvisorParams({ rating: "5" }).ratingMin).toBe(5);
    expect(parseAdvisorParams({ rating: "0" }).ratingMin).toBeUndefined();
    expect(parseAdvisorParams({ rating: "6" }).ratingMin).toBeUndefined();
    expect(parseAdvisorParams({ rating: "-1" }).ratingMin).toBeUndefined();
    expect(parseAdvisorParams({ rating: "abc" }).ratingMin).toBeUndefined();
  });

  it("境界値: page<1 / NaN は 1 に丸める", () => {
    expect(parseAdvisorParams({ page: "0" }).page).toBe(1);
    expect(parseAdvisorParams({ page: "-5" }).page).toBe(1);
    expect(parseAdvisorParams({ page: "abc" }).page).toBe(1);
    expect(parseAdvisorParams({ page: "2.9" }).page).toBe(2);
  });

  it("不正な method / sort はフォールバック", () => {
    expect(parseAdvisorParams({ method: "telepathy" }).method).toBeUndefined();
    expect(parseAdvisorParams({ sort: "bogus" }).sort).toBe("recommended");
  });

  it("配列クエリは先頭要素を採用", () => {
    expect(parseAdvisorParams({ category: ["tarot", "palmistry"] }).category).toBe("TAROT");
  });

  it("overrides.category が URL category より優先", () => {
    const p = parseAdvisorParams({ category: "tarot" }, { category: "PALMISTRY" });
    expect(p.category).toBe("PALMISTRY");
  });
});

describe("parseServiceParams", () => {
  it("service は price_asc / price_desc ソートを許可", () => {
    expect(parseServiceParams({ sort: "price_asc" }).sort).toBe("price_asc");
    expect(parseServiceParams({ sort: "price_desc" }).sort).toBe("price_desc");
    expect(parseServiceParams({ sort: "rating" }).sort).toBe("recommended"); // service に rating ソート無し
  });
});

describe("buildAdvisorQuery (URL 再現性 AC-B3-6)", () => {
  it("非デフォルト値のみクエリ文字列に含める", () => {
    const qs = buildAdvisorQuery(
      { category: "tarot", method: "phone", rating: "4", price: "1000-5000", sort: "rating", q: "恋愛" },
      2
    );
    const params = new URLSearchParams(qs);
    expect(params.get("category")).toBe("tarot");
    expect(params.get("method")).toBe("phone");
    expect(params.get("rating")).toBe("4");
    expect(params.get("price")).toBe("1000-5000");
    expect(params.get("sort")).toBe("rating");
    expect(params.get("q")).toBe("恋愛");
    expect(params.get("page")).toBe("2");
  });

  it("page=1 と sort=recommended は省略（URL を綺麗に保つ）", () => {
    const qs = buildAdvisorQuery({ sort: "recommended" }, 1);
    expect(qs).toBe("");
  });

  it("omitCategory で category を除外（カテゴリランディング用）", () => {
    const qs = buildAdvisorQuery({ category: "tarot", method: "chat" }, 1, { omitCategory: true });
    const params = new URLSearchParams(qs);
    expect(params.get("category")).toBeNull();
    expect(params.get("method")).toBe("chat");
  });

  it("parse → build の往復が安定（リロード再現性）", () => {
    const raw = { category: "tarot", method: "zoom", price: "2000-7000", sort: "newest" as const };
    const qs = buildAdvisorQuery(raw, 1);
    const reparsed = parseAdvisorParams(Object.fromEntries(new URLSearchParams(qs)));
    expect(reparsed.category).toBe("TAROT");
    expect(reparsed.method).toBe("ZOOM");
    expect(reparsed.priceMin).toBe(2000);
    expect(reparsed.priceMax).toBe(7000);
    expect(reparsed.sort).toBe("newest");
  });
});

describe("buildServiceQuery", () => {
  it("service ファセットを再シリアライズ（rating は対象外）", () => {
    const qs = buildServiceQuery({ category: "tarot", method: "email", price: "1000-3000", sort: "price_asc" }, 2);
    const params = new URLSearchParams(qs);
    expect(params.get("category")).toBe("tarot");
    expect(params.get("method")).toBe("email");
    expect(params.get("price")).toBe("1000-3000");
    expect(params.get("sort")).toBe("price_asc");
    expect(params.get("page")).toBe("2");
  });
});
