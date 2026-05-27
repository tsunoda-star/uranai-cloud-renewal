import type { DivinationCategorySlug } from "@prisma/client";

/**
 * 悩みカテゴリ → 占術カテゴリ マッピング（MNT-2 一元管理, spec §4.3）.
 *
 * マッチング相談で、ユーザーは「占術を直接選ぶ」または「悩みから選ぶ」を選べる。
 * 悩み選択時はここで定義した重み付き占術候補に展開する。重みは matching.ts の
 * スコアリングでカテゴリ一致点に乗じる（主たる占術ほど高い）。
 *
 * 値は固定ドメイン定数。ハードコードされた占い師/サービスではなく、業務上の
 * 「悩み → 適した占術」の対応表である（モックではない）。
 */

export interface ConcernCategory {
  /** URL / form 値（小文字 slug）。 */
  key: string;
  /** 表示名（日本語）。 */
  label: string;
  /** 関連占術カテゴリ（重み付き, 1.0=主, 0.5=副）。 */
  divinations: ReadonlyArray<{ slug: DivinationCategorySlug; weight: number }>;
}

export const CONCERN_CATEGORIES: readonly ConcernCategory[] = [
  {
    key: "love",
    label: "恋愛・結婚",
    divinations: [
      { slug: "TAROT", weight: 1 },
      { slug: "WESTERN_ASTROLOGY", weight: 1 },
      { slug: "SPIRITUAL_SENSE", weight: 0.5 },
      { slug: "NAME_DIVINATION", weight: 0.5 },
    ],
  },
  {
    key: "work",
    label: "仕事・転職",
    divinations: [
      { slug: "FOUR_PILLARS", weight: 1 },
      { slug: "NINE_STAR_KI", weight: 1 },
      { slug: "TAROT", weight: 0.5 },
      { slug: "SANMEI", weight: 0.5 },
    ],
  },
  {
    key: "money",
    label: "金運・財運",
    divinations: [
      { slug: "FENG_SHUI", weight: 1 },
      { slug: "NUMEROLOGY", weight: 1 },
      { slug: "FOUR_PILLARS", weight: 0.5 },
      { slug: "SIX_STAR", weight: 0.5 },
    ],
  },
  {
    key: "human",
    label: "人間関係",
    divinations: [
      { slug: "TAROT", weight: 1 },
      { slug: "NINE_STAR_KI", weight: 1 },
      { slug: "PHYSIOGNOMY", weight: 0.5 },
      { slug: "SPIRITUAL", weight: 0.5 },
    ],
  },
  {
    key: "future",
    label: "運勢・将来",
    divinations: [
      { slug: "WESTERN_ASTROLOGY", weight: 1 },
      { slug: "SIX_STAR", weight: 1 },
      { slug: "EKI", weight: 0.5 },
      { slug: "SANMEI", weight: 0.5 },
    ],
  },
  {
    key: "spiritual",
    label: "スピリチュアル・前世",
    divinations: [
      { slug: "SPIRITUAL", weight: 1 },
      { slug: "SPIRITUAL_SENSE", weight: 1 },
      { slug: "PALMISTRY", weight: 0.5 },
    ],
  },
] as const;

const CONCERN_BY_KEY = new Map(CONCERN_CATEGORIES.map((c) => [c.key, c]));

/** Resolve a concern key (form value) to its mapped, weighted divination set. */
export function concernToDivinations(
  key: string | undefined
): ReadonlyArray<{ slug: DivinationCategorySlug; weight: number }> {
  if (!key) return [];
  return CONCERN_BY_KEY.get(key)?.divinations ?? [];
}

/** Whether a string is a known concern key (form validation). */
export function isConcernKey(value: string | undefined): boolean {
  return value != null && CONCERN_BY_KEY.has(value);
}
