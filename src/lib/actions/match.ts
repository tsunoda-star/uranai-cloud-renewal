"use server";

import type { ConsultationMethod, DivinationCategorySlug } from "@prisma/client";

import { getMatchingEngine, type MatchingResult } from "@/lib/matching";
import { isConcernKey } from "@/lib/concern-mapping";
import { sanitizeText } from "@/lib/sanitize";

const VALID_METHODS: readonly ConsultationMethod[] = [
  "PHONE",
  "CHAT",
  "EMAIL",
  "ZOOM",
  "IN_PERSON",
];

const VALID_CATEGORY_SLUGS: readonly DivinationCategorySlug[] = [
  "TAROT",
  "PALMISTRY",
  "FOUR_PILLARS",
  "NINE_STAR_KI",
  "NUMEROLOGY",
  "SPIRITUAL_SENSE",
  "FENG_SHUI",
  "PHYSIOGNOMY",
  "WESTERN_ASTROLOGY",
  "SPIRITUAL",
  "SANMEI",
  "EKI",
  "NAME_DIVINATION",
  "SIX_STAR",
  "OTHER",
];

const MATCH_LIMIT = 6;

export interface MatchActionState {
  ok: boolean;
  /** 検索を実行したか（初期表示と区別するため）。 */
  searched: boolean;
  error?: string;
  result?: MatchingResult;
}

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * マッチング相談 Server Action（spec §4.3, AC-B6）.
 *
 * 候補生成は `getMatchingEngine()`（現状ルールベース, NF-6 で AI 差替可）に委譲。
 * 入力は悩みカテゴリ or 占術カテゴリ + 希望相談形式 + 自由記述。自由記述は表示・
 * 将来の AI 入力用にサニタイズして受領するがスコアには使わない。0 件時は
 * フォールバック（人気占い師）をエンジン側で返す（AC-B6-5）。
 */
export async function runMatching(
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const concernRaw = asString(formData.get("concern")).trim();
  const divinationRaw = asString(formData.get("divination")).trim().toUpperCase();
  const methodRaw = asString(formData.get("method")).trim().toUpperCase();
  const noteRaw = asString(formData.get("note"));

  const concern = isConcernKey(concernRaw) ? concernRaw : undefined;
  const divination = (VALID_CATEGORY_SLUGS as readonly string[]).includes(
    divinationRaw
  )
    ? (divinationRaw as DivinationCategorySlug)
    : undefined;
  const method = (VALID_METHODS as readonly string[]).includes(methodRaw)
    ? (methodRaw as ConsultationMethod)
    : undefined;
  const note = noteRaw.trim() ? sanitizeText(noteRaw, 1000) : undefined;

  // 少なくとも 1 つの手掛かりが必要（全空はフォールバック母集団が広すぎるため弾く）。
  if (!concern && !divination && !method && !note) {
    return {
      ok: false,
      searched: false,
      error: "悩みカテゴリ・占術・相談形式のいずれかを選択してください。",
    };
  }

  const engine = getMatchingEngine();
  const result = await engine.match(
    { concern, divination, method, note },
    MATCH_LIMIT
  );

  return { ok: true, searched: true, result };
}
