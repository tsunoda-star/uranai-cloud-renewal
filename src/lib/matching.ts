import type {
  ConsultationMethod,
  DivinationCategorySlug,
  Prisma,
} from "@prisma/client";

import { db } from "@/lib/db";
import { concernToDivinations } from "@/lib/concern-mapping";
import type { AdvisorCardView } from "@/lib/queries";

/**
 * マッチング相談 候補生成（spec §4.3, AC-B6, NF-6）.
 *
 * 設計意図: 候補生成を `MatchingEngine` インターフェースの背後に隠蔽し、現状の
 * ルールベース実装（`RuleBasedMatchingEngine`）を将来の AI 推薦実装へ差し替え
 * 可能にする（NF-6）。呼び出し側（Server Action）は `getMatchingEngine()` が
 * 返すエンジンにのみ依存する。
 *
 * スコアリング（ルールベース）:
 *   score = Σ(占術カテゴリ一致 × 重み × 10)        // 悩み→占術マッピングの重み
 *         + (相談形式が対応 ? 6 : 0)                // 希望相談形式の対応
 *         + (ratingAverage ?? 0) × 2                // 評価（実データ集計値）
 *         + (ratingCount に対する小さな信頼度ボーナス)
 *   主占術（isPrimary）一致は +4 の加点。
 *
 * 0 件時は人気占い師（評価順）にフォールバックする（AC-B6-5）。
 * 要配慮情報は一切読まない（§12）。
 */

/** マッチング入力（悩みカテゴリ or 占術カテゴリ + 希望相談形式 + 自由記述）。 */
export interface MatchingInput {
  /** 直接指定された占術カテゴリ（任意）。 */
  divination?: DivinationCategorySlug;
  /** 悩みカテゴリ key（任意, concern-mapping）。 */
  concern?: string;
  /** 希望相談形式（任意）。 */
  method?: ConsultationMethod;
  /** 自由記述（スコアには使わず、表示・将来の AI 入力用に受領）。 */
  note?: string;
}

export interface MatchedAdvisor {
  advisor: AdvisorCardView;
  /** 総合スコア（降順に並ぶ。デバッグ/将来の説明表示用）。 */
  score: number;
}

export interface MatchingResult {
  candidates: MatchedAdvisor[];
  /** true のとき 0 件マッチのため人気占い師フォールバックを返した（AC-B6-5）。 */
  fallback: boolean;
}

/** 候補生成エンジン抽象（NF-6: AI 差し替え点）。 */
export interface MatchingEngine {
  readonly name: string;
  match(input: MatchingInput, limit: number): Promise<MatchingResult>;
}

/** カード整形に必要な published 占い師の最小 select。 */
const MATCH_SELECT = {
  slug: true,
  bio: true,
  photoUrl: true,
  ratingAverage: true,
  ratingCount: true,
  user: { select: { displayName: true, avatarUrl: true } },
  categories: {
    orderBy: { isPrimary: "desc" },
    select: {
      isPrimary: true,
      category: { select: { slug: true, name: true } },
    },
  },
  methods: { select: { method: true } },
} satisfies Prisma.FortuneTellerProfileSelect;

type MatchRow = Prisma.FortuneTellerProfileGetPayload<{
  select: typeof MATCH_SELECT;
}>;

function toCard(a: MatchRow): AdvisorCardView {
  return {
    slug: a.slug,
    displayName: a.user.displayName,
    avatarUrl: a.photoUrl ?? a.user.avatarUrl ?? null,
    excerpt: a.bio,
    categories: a.categories.map((c) => ({
      slug: c.category.slug,
      label: c.category.name,
    })),
    methods: a.methods.map((m) => m.method),
    rating:
      a.ratingAverage != null
        ? { average: a.ratingAverage, count: a.ratingCount }
        : null,
  };
}

/** ルールベース実装。 */
class RuleBasedMatchingEngine implements MatchingEngine {
  readonly name = "rule-based";

  async match(input: MatchingInput, limit: number): Promise<MatchingResult> {
    // 目標占術の重みマップを構築（直接指定 + 悩みマッピングの和）。
    const weights = new Map<DivinationCategorySlug, number>();
    if (input.divination) {
      weights.set(input.divination, 1);
    }
    for (const { slug, weight } of concernToDivinations(input.concern)) {
      weights.set(slug, Math.max(weights.get(slug) ?? 0, weight));
    }

    // 候補母集団: 目標占術 or 希望形式に少しでも関連する published 占い師。
    // 関連が一切無い指定（例: 自由記述のみ）の場合は published 全体から評価する。
    const orFilters: Prisma.FortuneTellerProfileWhereInput[] = [];
    if (weights.size > 0) {
      orFilters.push({
        categories: {
          some: { category: { slug: { in: [...weights.keys()] } } },
        },
      });
    }
    if (input.method) {
      orFilters.push({ methods: { some: { method: input.method } } });
    }

    const where: Prisma.FortuneTellerProfileWhereInput = {
      isPublished: true,
      ...(orFilters.length > 0 ? { OR: orFilters } : {}),
    };

    const rows = await db.fortuneTellerProfile.findMany({
      where,
      // 母集団は控えめに広めに取り、アプリ層で精スコアリング（PERF: 上限 60）。
      take: 60,
      orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
      select: MATCH_SELECT,
    });

    const scored: MatchedAdvisor[] = rows
      .map((a) => ({ advisor: toCard(a), score: scoreRow(a, weights, input.method) }))
      .filter((m) => m.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, limit);

    if (scored.length > 0) {
      return { candidates: scored, fallback: false };
    }

    // フォールバック: 人気（評価）順の published 占い師（AC-B6-5）。
    const popular = await db.fortuneTellerProfile.findMany({
      where: { isPublished: true },
      orderBy: [{ ratingAverage: "desc" }, { ratingCount: "desc" }],
      take: limit,
      select: MATCH_SELECT,
    });
    return {
      candidates: popular.map((a) => ({ advisor: toCard(a), score: 0 })),
      fallback: true,
    };
  }
}

/** 1 行のスコアを算出（純関数, テスト容易）。 */
function scoreRow(
  a: MatchRow,
  weights: Map<DivinationCategorySlug, number>,
  method: ConsultationMethod | undefined
): number {
  let score = 0;

  for (const c of a.categories) {
    const w = weights.get(c.category.slug);
    if (w != null) {
      score += w * 10;
      if (c.isPrimary) score += 4; // 主占術一致は加点
    }
  }

  if (method && a.methods.some((m) => m.method === method)) {
    score += 6;
  }

  if (a.ratingAverage != null) {
    score += a.ratingAverage * 2;
    // 評価件数による小さな信頼度ボーナス（上限 2 点）。
    score += Math.min(a.ratingCount / 50, 2);
  }

  return score;
}

const ruleBasedEngine = new RuleBasedMatchingEngine();

/**
 * 現在有効なマッチングエンジンを返す（NF-6 差し替え点）。
 * 将来 AI 実装を `MATCHING_ENGINE=ai` 等で選択できるよう、選択をここに集約する。
 */
export function getMatchingEngine(): MatchingEngine {
  return ruleBasedEngine;
}
