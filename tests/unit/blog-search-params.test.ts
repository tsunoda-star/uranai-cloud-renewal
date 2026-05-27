import { describe, it, expect } from "vitest";
import { parsePostParams, buildPostQuery } from "@/lib/blog-search-params";

/**
 * 単体: ブログ一覧 URL searchParams のパース/再シリアライズ（U-12, AC-C1-5/6）.
 * q（キーワード）と page のみがクエリ文字列に乗る。category/tag は path segment。
 */
describe("parsePostParams", () => {
  it("空 params はデフォルト（page=1, perPage=9）", () => {
    const p = parsePostParams({});
    expect(p.page).toBe(1);
    expect(p.perPage).toBe(9);
    expect(p.q).toBeUndefined();
    expect(p.categorySlug).toBeUndefined();
    expect(p.tagSlug).toBeUndefined();
  });

  it("q を trim、空文字は undefined に正規化", () => {
    expect(parsePostParams({ q: "  タロット  " }).q).toBe("タロット");
    expect(parsePostParams({ q: "   " }).q).toBeUndefined();
    expect(parsePostParams({ q: "" }).q).toBeUndefined();
  });

  it("page を解釈（NaN/0/負数は 1、小数は floor）", () => {
    expect(parsePostParams({ page: "4" }).page).toBe(4);
    expect(parsePostParams({ page: "0" }).page).toBe(1);
    expect(parsePostParams({ page: "-3" }).page).toBe(1);
    expect(parsePostParams({ page: "abc" }).page).toBe(1);
    expect(parsePostParams({ page: "3.7" }).page).toBe(3);
  });

  it("overrides で categorySlug / tagSlug を path から供給", () => {
    const byCat = parsePostParams({}, { categorySlug: "love" });
    expect(byCat.categorySlug).toBe("love");
    const byTag = parsePostParams({}, { tagSlug: "tarot" });
    expect(byTag.tagSlug).toBe("tarot");
  });

  it("配列クエリは先頭要素を採用", () => {
    expect(parsePostParams({ q: ["占い", "two"] }).q).toBe("占い");
  });
});

describe("buildPostQuery", () => {
  it("q と page>1 のみクエリに含める", () => {
    const qs = buildPostQuery({ q: "タロット" }, 3);
    const params = new URLSearchParams(qs);
    expect(params.get("q")).toBe("タロット");
    expect(params.get("page")).toBe("3");
  });

  it("page=1 は省略、q なしも省略", () => {
    expect(buildPostQuery({}, 1)).toBe("");
    expect(buildPostQuery({ q: "  " }, 1)).toBe("");
  });

  it("parse → build の往復が安定", () => {
    const qs = buildPostQuery({ q: "金運" }, 2);
    const reparsed = parsePostParams(Object.fromEntries(new URLSearchParams(qs)));
    expect(reparsed.q).toBe("金運");
    expect(reparsed.page).toBe(2);
  });
});
