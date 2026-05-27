import { describe, it, expect } from "vitest";
import { slugify, isValidSlug, makeUniqueSlug } from "@/lib/blog/slug";

/**
 * 単体: slug 生成・正規化・一意化（U-7, AC-C2 / SEO-16）.
 */
describe("slugify", () => {
  it("英語タイトルを小文字ハイフン slug に正規化", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("  Tarot   Beginners  Guide ")).toBe("tarot-beginners-guide");
  });

  it("英数字/ハイフン以外を除去し、連続ハイフンを圧縮、両端トリム", () => {
    expect(slugify("Foo!!!  Bar??")).toBe("foo-bar");
    expect(slugify("--a--b--")).toBe("a-b");
    // `_` は「英数字/空白/ハイフン以外」として先に除去される → 'underscore'。
    // その後に空白がハイフン化されるため 'underscore-test' になる（実装準拠）。
    expect(slugify("under_score test")).toBe("underscore-test");
  });

  it("日本語のみのタイトルはフォールバック 'post' になる", () => {
    expect(slugify("はじめてのタロット占い")).toBe("post");
    expect(slugify("　　")).toBe("post");
    expect(slugify("")).toBe("post");
  });

  it("日本語 + 英数字混在は英数字部分のみ残す", () => {
    expect(slugify("2026年の恋愛運 Love Fortune")).toBe("2026-love-fortune");
  });

  it("80 文字を超える slug は切り詰め、末尾ハイフンを除去", () => {
    const long = "word ".repeat(40); // 200 文字相当
    const s = slugify(long);
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it("妥当な slug 形式のみ true", () => {
    expect(isValidSlug("hello-world")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("2026-love-fortune")).toBe(true);
  });

  it("不正な slug 形式は false", () => {
    expect(isValidSlug("Hello-World")).toBe(false); // 大文字
    expect(isValidSlug("-leading")).toBe(false);
    expect(isValidSlug("trailing-")).toBe(false);
    expect(isValidSlug("double--hyphen")).toBe(false);
    expect(isValidSlug("with space")).toBe(false);
    expect(isValidSlug("日本語")).toBe(false);
    expect(isValidSlug("a".repeat(81))).toBe(false);
  });
});

describe("makeUniqueSlug", () => {
  it("未使用ならそのまま返す", async () => {
    const slug = await makeUniqueSlug("Hello World", async () => false);
    expect(slug).toBe("hello-world");
  });

  it("衝突時は -2, -3 … サフィックスで一意化", async () => {
    const taken = new Set(["hello-world", "hello-world-2"]);
    const slug = await makeUniqueSlug("Hello World", async (s) => taken.has(s));
    expect(slug).toBe("hello-world-3");
  });

  it("日本語タイトルは post → post-2 ... で一意化", async () => {
    const taken = new Set(["post"]);
    const slug = await makeUniqueSlug("占いの話", async (s) => taken.has(s));
    expect(slug).toBe("post-2");
  });

  it("isTaken は呼び出された回数だけ照会される（最小照会）", async () => {
    let calls = 0;
    await makeUniqueSlug("foo", async () => {
      calls += 1;
      return false;
    });
    expect(calls).toBe(1);
  });
});
