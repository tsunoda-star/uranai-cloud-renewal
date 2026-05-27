import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { MatchingForm } from "@/components/match/matching-form";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "占い師マッチング診断",
  description:
    "悩みのカテゴリや希望の相談形式から、あなたに合った占い師をご提案します。",
  alternates: { canonical: absoluteUrl("/match") },
};

/**
 * /match — マッチング相談フォーム + 結果（spec §2, §4.3, AC-B6）.
 * 閲覧・マッチングは 3 ロールとも可（spec §3）。ログイン不要で診断でき、
 * 候補カードから予約（要ログイン）へ進む。
 */
export default function MatchPage() {
  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-rose-pale"
          aria-hidden="true"
        >
          <Sparkles className="h-6 w-6 text-brand-teal-strong" />
        </span>
        <h1 className="mt-4 text-balance font-heading text-h1 font-bold text-primary">
          あなたにぴったりの占い師を探す
        </h1>
        <p className="mt-3 text-body-lg text-gray-500">
          いまの悩みや希望の相談スタイルを教えてください。相性のよい占い師をご提案します。
        </p>
      </header>

      <div className="mt-10">
        <MatchingForm />
      </div>
    </div>
  );
}
