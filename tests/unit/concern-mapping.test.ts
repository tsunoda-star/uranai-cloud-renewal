import { describe, it, expect } from "vitest";
import {
  CONCERN_CATEGORIES,
  concernToDivinations,
  isConcernKey,
} from "@/lib/concern-mapping";

/**
 * 単体: 悩み→占術 重みマッピング（U-4 の一部, AC-B6-3 / MNT-2）.
 * 純関数・決定的。DB 非依存。
 */
describe("concern-mapping", () => {
  it("全悩みカテゴリが key/label/divinations を持つ", () => {
    expect(CONCERN_CATEGORIES.length).toBeGreaterThanOrEqual(6);
    for (const c of CONCERN_CATEGORIES) {
      expect(c.key).toMatch(/^[a-z]+$/);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.divinations.length).toBeGreaterThan(0);
    }
  });

  it("既知の悩みキー → 重み付き占術セットを返す（恋愛: TAROT 主=1.0）", () => {
    const love = concernToDivinations("love");
    expect(love.length).toBeGreaterThan(0);
    const tarot = love.find((d) => d.slug === "TAROT");
    expect(tarot).toBeDefined();
    expect(tarot!.weight).toBe(1);
    // 副占術は 0.5 の重みを含む（主/副の二段階）。
    expect(love.some((d) => d.weight === 0.5)).toBe(true);
  });

  it("仕事/金運/人間関係/将来/スピリチュアル も主占術 weight=1 を含む", () => {
    for (const key of ["work", "money", "human", "future", "spiritual"]) {
      const set = concernToDivinations(key);
      expect(set.length).toBeGreaterThan(0);
      expect(set.some((d) => d.weight === 1)).toBe(true);
    }
  });

  it("未知キー / undefined は空配列（フォールバック）", () => {
    expect(concernToDivinations("nonexistent")).toEqual([]);
    expect(concernToDivinations(undefined)).toEqual([]);
    expect(concernToDivinations("")).toEqual([]);
  });

  it("isConcernKey は既知キーのみ true", () => {
    expect(isConcernKey("love")).toBe(true);
    expect(isConcernKey("work")).toBe(true);
    expect(isConcernKey("unknown")).toBe(false);
    expect(isConcernKey(undefined)).toBe(false);
  });

  it("重みは 0 < weight <= 1 の範囲（スコアリング前提を担保）", () => {
    for (const c of CONCERN_CATEGORIES) {
      for (const d of c.divinations) {
        expect(d.weight).toBeGreaterThan(0);
        expect(d.weight).toBeLessThanOrEqual(1);
      }
    }
  });
});
