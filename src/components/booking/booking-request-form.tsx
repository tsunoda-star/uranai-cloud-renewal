"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarHeart, Plus, X, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { METHOD_META } from "@/lib/divination";
import {
  createBookingRequest,
  type BookingActionState,
} from "@/lib/actions/booking";
import type { BookingTargetView } from "@/lib/queries";

const MAX_SLOTS = 3;

const initialState: BookingActionState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="font-semibold">
      <CalendarHeart className="h-5 w-5" aria-hidden="true" />
      {pending ? "送信中…" : "この内容でリクエストする"}
    </Button>
  );
}

/**
 * 予約リクエストフォーム（AC-B7-1/2, spec §4.1）.
 * - 相談形式: 対象占い師の AdvisorMethod からのみ選択
 * - 希望日時候補: 最大 3（datetime-local, 動的に追加/削除）
 * - 相談概要: free text（サーバ側でサニタイズ + 検証）
 * - 任意でサービス（鑑定メニュー）を選択
 *
 * 検証・サニタイズ・レート制限・所有権はすべて Server Action 側で強制（多層防御）。
 * このフォームは入力補助と即時のフィールドエラー表示のみ担う。
 */
export function BookingRequestForm({
  target,
  defaultServiceId,
}: {
  target: BookingTargetView;
  defaultServiceId?: string;
}) {
  const [state, formAction] = useActionState(
    createBookingRequest,
    initialState
  );

  // 初期相談形式: サービス既定があればその method、なければ最初の対応 method。
  const defaultService = defaultServiceId
    ? target.services.find((s) => s.id === defaultServiceId)
    : undefined;
  const [method, setMethod] = React.useState<string>(
    defaultService?.method ?? target.methods[0] ?? ""
  );
  const [slotCount, setSlotCount] = React.useState(1);

  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="advisorSlug" value={target.slug} />

      {state.error && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-base border border-state-danger/30 bg-destructive/10 px-4 py-3 text-sm text-state-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}

      {/* 鑑定メニュー（任意） */}
      {target.services.length > 0 && (
        <div>
          <label
            htmlFor="serviceId"
            className="block text-sm font-medium text-primary"
          >
            鑑定メニュー（任意）
          </label>
          <select
            id="serviceId"
            name="serviceId"
            defaultValue={defaultServiceId ?? ""}
            className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">指定しない（相談内容で相談する）</option>
            {target.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}（{METHOD_META[s.method].label} / {s.durationMin}分）
              </option>
            ))}
          </select>
          {fe?.service && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.service}</p>
          )}
        </div>
      )}

      {/* 相談形式（対象占い師の対応形式のみ） */}
      <fieldset>
        <legend className="text-sm font-medium text-primary">相談形式</legend>
        <p className="mt-1 text-xs text-gray-500">
          {target.displayName} さんが対応している形式から選べます。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {target.methods.map((m) => {
            const meta = METHOD_META[m];
            const Icon = meta.icon;
            const active = method === m;
            return (
              <label
                key={m}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-base border px-4 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                  active
                    ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
                    : "border-input bg-background text-primary hover:bg-secondary"
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={m}
                  checked={active}
                  onChange={() => setMethod(m)}
                  className="sr-only"
                />
                <Icon
                  className="h-4 w-4 text-brand-teal-strong"
                  aria-hidden="true"
                />
                {meta.label}
              </label>
            );
          })}
        </div>
        {fe?.method && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.method}</p>
        )}
      </fieldset>

      {/* 希望日時候補（最大 3） */}
      <fieldset>
        <legend className="text-sm font-medium text-primary">
          希望日時候補（最大{MAX_SLOTS}件）
        </legend>
        <p className="mt-1 text-xs text-gray-500">
          ご希望の日時を未来の日付で入力してください。複数候補があると調整がスムーズです。
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: slotCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="datetime-local"
                name={`slot${i}`}
                aria-label={`希望日時候補 ${i + 1}`}
                className="h-11"
              />
              {slotCount > 1 && i === slotCount - 1 && (
                <button
                  type="button"
                  onClick={() => setSlotCount((c) => Math.max(1, c - 1))}
                  aria-label={`希望日時候補 ${i + 1} を削除`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-base border border-input text-gray-500 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {slotCount < MAX_SLOTS && (
          <button
            type="button"
            onClick={() => setSlotCount((c) => Math.min(MAX_SLOTS, c + 1))}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand-teal-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            候補を追加
          </button>
        )}
        {fe?.slots && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.slots}</p>
        )}
      </fieldset>

      {/* 相談概要 */}
      <div>
        <label
          htmlFor="summary"
          className="block text-sm font-medium text-primary"
        >
          相談したい内容
        </label>
        <p className="mt-1 text-xs text-gray-500">
          ご相談の概要をお書きください（本人・宛先の占い師・運営のみが閲覧します）。
        </p>
        <Textarea
          id="summary"
          name="summary"
          required
          minLength={10}
          maxLength={2000}
          placeholder="例）最近の人間関係について悩んでいます。とくに職場での……"
          className="mt-2"
          aria-describedby={fe?.summary ? "summary-error" : undefined}
        />
        {fe?.summary && (
          <p id="summary-error" className="mt-1.5 text-xs text-state-danger">
            {fe.summary}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-xs text-gray-500">
          送信後、占い師の承認をお待ちください。決済・実鑑定は次フェーズで提供予定です。
        </p>
      </div>
    </form>
  );
}
