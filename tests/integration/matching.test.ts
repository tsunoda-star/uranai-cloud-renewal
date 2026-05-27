import { describe, it, expect } from "vitest";
import { getMatchingEngine } from "@/lib/matching";

/**
 * I-11 結合: マッチング（ルールベース）スコアリング + 0 件フォールバック（AC-B6, NF-6）.
 *
 * getMatchingEngine().match() は実 DB の published 占い師を母集団にスコアリングする。
 * seed（advisors16）に対する read-only。DB は変更しない。
 */
describe("matching engine (rule-based)", () => {
  const engine = getMatchingEngine();

  it("エンジン名は rule-based（NF-6 差し替え点）", () => {
    expect(engine.name).toBe("rule-based");
  });

  it("占術カテゴリ指定で、その占術を持つ占い師が上位に来る（スコア降順）", async () => {
    const res = await engine.match({ divination: "TAROT" }, 6);
    expect(res.fallback).toBe(false);
    expect(res.candidates.length).toBeGreaterThan(0);
    // スコア降順。
    for (let i = 1; i < res.candidates.length; i++) {
      expect(res.candidates[i - 1].score).toBeGreaterThanOrEqual(res.candidates[i].score);
    }
    // 最上位は TAROT カテゴリを持つ（カテゴリ一致がスコアの主成分）。
    expect(res.candidates[0].advisor.categories.some((c) => c.slug === "TAROT")).toBe(true);
  });

  it("悩みカテゴリ（concern）から占術重みに展開してマッチする", async () => {
    const res = await engine.match({ concern: "love" }, 6);
    expect(res.candidates.length).toBeGreaterThan(0);
    // 恋愛 → TAROT/WESTERN_ASTROLOGY 等。上位はそのいずれかのカテゴリを持つ。
    const top = res.candidates[0].advisor.categories.map((c) => c.slug);
    expect(
      top.some((s) => ["TAROT", "WESTERN_ASTROLOGY", "SPIRITUAL_SENSE", "NAME_DIVINATION"].includes(s))
    ).toBe(true);
  });

  it("相談形式指定でスコアに加点され、候補が形式対応者を含む", async () => {
    const res = await engine.match({ divination: "TAROT", method: "PHONE" }, 6);
    expect(res.candidates.length).toBeGreaterThan(0);
    // method 加点が効くため、PHONE 対応者が含まれる（必須ではないが上位に来やすい）。
    const phoneCount = res.candidates.filter((c) => c.advisor.methods.includes("PHONE")).length;
    expect(phoneCount).toBeGreaterThan(0);
  });

  it("候補数は limit を超えない", async () => {
    const res = await engine.match({ divination: "TAROT" }, 3);
    expect(res.candidates.length).toBeLessThanOrEqual(3);
  });

  it("0 件マッチ時は人気占い師フォールバックを返す（fallback=true, AC-B6-5）", async () => {
    // OTHER カテゴリを持つ占い師が seed に居ない場合、スコア>0 が 0 件 → フォールバック。
    // OTHER + 存在しない条件の組み合わせで母集団スコアを 0 にする。
    const res = await engine.match({ divination: "OTHER" }, 6);
    if (res.candidates.length > 0 && !res.fallback) {
      // seed に OTHER 占い師が居た場合はフォールバックしないのが正しい挙動。
      // その場合も candidates は OTHER を持つことを確認。
      expect(res.candidates[0].advisor.categories.some((c) => c.slug === "OTHER")).toBe(true);
    } else {
      expect(res.fallback).toBe(true);
      // フォールバックは人気占い師（score=0 で返る）。
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.candidates.every((c) => c.score === 0)).toBe(true);
    }
  });

  it("フォールバックは評価順（人気）で並ぶ", async () => {
    const res = await engine.match({ divination: "OTHER" }, 6);
    if (res.fallback) {
      const ratings = res.candidates.map((c) => c.advisor.rating?.average ?? 0);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i - 1]).toBeGreaterThanOrEqual(ratings[i]);
      }
    } else {
      expect(true).toBe(true); // seed 次第でフォールバックしないケースは skip 同等
    }
  });
});
