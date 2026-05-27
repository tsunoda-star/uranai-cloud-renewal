"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles, AlertCircle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FortuneTellerCard } from "@/components/home/fortune-teller-card";
import { METHOD_META } from "@/lib/divination";
import { CONCERN_CATEGORIES } from "@/lib/concern-mapping";
import { CONSULTATION_METHODS } from "@/lib/queries";
import { runMatching, type MatchActionState } from "@/lib/actions/match";

const initialState: MatchActionState = { ok: false, searched: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="font-semibold">
      <Sparkles className="h-5 w-5" aria-hidden="true" />
      {pending ? "診断中…" : "ぴったりの占い師を探す"}
    </Button>
  );
}

/**
 * マッチング相談フォーム + 結果（AC-B6, spec §4.3）.
 *
 * 入力: 悩みカテゴリ（→占術にマッピング）/ 希望相談形式 / 自由記述。
 * Server Action `runMatching` がルールベースで候補を返す（0 件は人気占い師へ
 * フォールバック）。候補は既存 FortuneTellerCard で提示し、カードからプロフィール
 * /予約へ遷移できる。
 */
export function MatchingForm() {
  const [state, formAction] = useActionState(runMatching, initialState);

  return (
    <div className="flex flex-col gap-10">
      <form
        action={formAction}
        className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base sm:p-8"
        noValidate
      >
        {state.error && !state.ok && (
          <p
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-base border border-state-danger/30 bg-destructive/10 px-4 py-3 text-sm text-state-danger"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {state.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 悩みカテゴリ */}
          <div>
            <label
              htmlFor="concern"
              className="block text-sm font-medium text-primary"
            >
              悩みのカテゴリ
            </label>
            <select
              id="concern"
              name="concern"
              defaultValue=""
              className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">選択しない</option>
              {CONCERN_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              悩みから相性のよい占術を自動で選びます。
            </p>
          </div>

          {/* 希望相談形式 */}
          <div>
            <label
              htmlFor="method"
              className="block text-sm font-medium text-primary"
            >
              希望の相談形式
            </label>
            <select
              id="method"
              name="method"
              defaultValue=""
              className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">こだわらない</option>
              {CONSULTATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_META[m].label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              対応している占い師を優先します。
            </p>
          </div>
        </div>

        {/* 自由記述 */}
        <div className="mt-6">
          <label
            htmlFor="note"
            className="block text-sm font-medium text-primary"
          >
            相談したいこと（任意）
          </label>
          <Textarea
            id="note"
            name="note"
            maxLength={1000}
            placeholder="例）転職するか迷っています。背中を押してくれる占い師さんを探しています。"
            className="mt-2"
          />
        </div>

        <div className="mt-6">
          <SubmitButton />
        </div>
      </form>

      {/* 結果 */}
      {state.searched && state.result && (
        <section aria-label="マッチング結果">
          {state.result.fallback ? (
            <div className="mb-5 flex items-start gap-2 rounded-base border border-brand-rose-pale bg-brand-rose-pale/40 px-4 py-3 text-sm text-brand-teal-strong">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              条件にぴったりの占い師が見つかりませんでした。かわりに人気の占い師をご紹介します。
            </div>
          ) : (
            <h2 className="mb-5 font-heading text-h3 font-semibold text-primary">
              あなたにおすすめの占い師（{state.result.candidates.length}名）
            </h2>
          )}

          {state.result.candidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              現在ご紹介できる占い師がいません。時間をおいて再度お試しください。
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {state.result.candidates.map((m) => (
                <li key={m.advisor.slug}>
                  <FortuneTellerCard advisor={m.advisor} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
