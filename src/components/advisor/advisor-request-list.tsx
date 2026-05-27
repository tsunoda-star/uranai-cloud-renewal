"use client";

import * as React from "react";
import {
  CalendarClock,
  MessageSquare,
  Check,
  CalendarPlus,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { METHOD_META } from "@/lib/divination";
import { CONSULTATION_STATUS_META } from "@/lib/consultation-status";
import type { AdvisorResponseAction } from "@/lib/consultation-status";
import { formatDateTime, toIsoDateTime } from "@/lib/format";
import { respondToRequest } from "@/lib/actions/consultation";
import type { AdvisorRequestView } from "@/lib/queries";
import type { ConsultationStatus } from "@prisma/client";

const ERROR_MESSAGE: Record<string, string> = {
  unauthenticated: "ログインが必要です。",
  forbidden: "この操作は許可されていません。",
  not_found: "リクエストが見つかりませんでした。",
  invalid_transition: "現在の状態ではこの操作はできません。",
  invalid_input: "入力内容を確認してください。",
  not_advisor: "占い師のみ応答できます。",
};

/**
 * 受信リクエスト一覧（占い師用, AC-B7-3/4/5）.
 * 各カードで accept / reschedule / decline を選び、Server Action 経由で状態遷移する。
 * summary（要配慮情報）は既定で隠し、明示操作で開示（§12 慎重表示）。状態遷移・所有権・
 * バリデーションはすべてサーバ側で強制（このUIは入力補助のみ）。
 */
export function AdvisorRequestList({
  requests,
}: {
  requests: AdvisorRequestView[];
}) {
  if (requests.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-8 text-center text-sm text-gray-500">
        受信した予約リクエストはまだありません。
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {requests.map((req) => (
        <AdvisorRequestCard key={req.id} req={req} />
      ))}
    </ul>
  );
}

type Mode = "idle" | "reschedule" | "decline";

function AdvisorRequestCard({ req }: { req: AdvisorRequestView }) {
  const [status, setStatus] = React.useState<ConsultationStatus>(req.status);
  const [responseMessage, setResponseMessage] = React.useState<string | null>(
    req.responseMessage
  );
  const [proposedSlot, setProposedSlot] = React.useState<Date | null>(
    req.proposedSlot
  );
  const [mode, setMode] = React.useState<Mode>("idle");
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const messageRef = React.useRef<HTMLTextAreaElement>(null);
  const slotRef = React.useRef<HTMLInputElement>(null);

  const statusMeta = CONSULTATION_STATUS_META[status];
  const methodMeta = METHOD_META[req.method];
  const MethodIcon = methodMeta.icon;
  const actionable = status === "PENDING" || status === "RESCHEDULED";

  function runAction(
    action: AdvisorResponseAction,
    extra?: { responseMessage?: string; proposedSlot?: string }
  ) {
    setError(null);
    startTransition(async () => {
      const result = await respondToRequest({
        requestId: req.id,
        action,
        ...extra,
      });
      if (result.ok) {
        setStatus(
          action === "accept"
            ? "ACCEPTED"
            : action === "reschedule"
              ? "RESCHEDULED"
              : "DECLINED"
        );
        if (extra?.responseMessage) setResponseMessage(extra.responseMessage);
        if (action === "reschedule" && extra?.proposedSlot) {
          setProposedSlot(new Date(extra.proposedSlot));
        }
        setMode("idle");
      } else {
        setError(ERROR_MESSAGE[result.error ?? ""] ?? "操作に失敗しました。");
      }
    });
  }

  function onAccept() {
    runAction("accept", {
      responseMessage: messageRef.current?.value.trim() || undefined,
    });
  }

  function onSubmitReschedule(e: React.FormEvent) {
    e.preventDefault();
    const slot = slotRef.current?.value ?? "";
    const message = messageRef.current?.value.trim() ?? "";
    if (!slot) {
      setError("提案する日時を入力してください。");
      return;
    }
    if (!message) {
      setError("日程調整のひとことコメントを入力してください。");
      return;
    }
    runAction("reschedule", { proposedSlot: slot, responseMessage: message });
  }

  function onSubmitDecline(e: React.FormEvent) {
    e.preventDefault();
    const message = messageRef.current?.value.trim() ?? "";
    if (!message) {
      setError("辞退の理由・ひとことを入力してください。");
      return;
    }
    runAction("decline", { responseMessage: message });
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar
            name={req.requester.displayName}
            src={req.requester.avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-heading text-h4 font-semibold text-primary">
              {req.requester.displayName}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <MethodIcon
                  className="h-3.5 w-3.5 text-brand-teal-strong"
                  aria-hidden="true"
                />
                {methodMeta.label}
              </span>
              {req.service && <span>メニュー: {req.service.title}</span>}
              <time
                dateTime={toIsoDateTime(req.createdAt)}
                className="tabular-nums"
              >
                {formatDateTime(req.createdAt)} 受信
              </time>
            </p>
          </div>
        </div>
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
      </div>

      {/* 希望日時候補 */}
      {req.preferredSlots.length > 0 && (
        <div className="mt-4 rounded-base bg-secondary/60 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <CalendarClock
              className="h-3.5 w-3.5 text-brand-teal-strong"
              aria-hidden="true"
            />
            希望日時候補
          </p>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {req.preferredSlots.map((slot, i) => (
              <li key={i} className="text-xs tabular-nums text-gray-600">
                <time dateTime={toIsoDateTime(slot)}>
                  {formatDateTime(slot)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 相談概要（要配慮情報・既定で非開示, §12） */}
      <div className="mt-4 rounded-base border border-gray-200">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ShieldAlert
              className="h-3.5 w-3.5 text-state-warning-fg"
              aria-hidden="true"
            />
            相談概要（取り扱い注意）
          </p>
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-expanded={summaryOpen}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-2 text-xs font-medium text-brand-teal-strong transition-colors hover:bg-brand-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {summaryOpen ? (
              <>
                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                内容を隠す
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                内容を表示
              </>
            )}
          </button>
        </div>
        {summaryOpen && (
          <p className="whitespace-pre-wrap border-t border-gray-200 px-3 py-2.5 text-sm leading-relaxed text-gray-700">
            {req.summary}
          </p>
        )}
      </div>

      {/* これまでの応答 */}
      {responseMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-base border border-gray-200 px-3 py-2.5">
          <MessageSquare
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-gray-600">
            <span className="font-medium text-primary">あなたの応答：</span>
            {responseMessage}
            {proposedSlot && (
              <>
                {" "}
                <span className="tabular-nums">
                  （提案日時: {formatDateTime(proposedSlot)}）
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-state-danger">
          {error}
        </p>
      )}

      {/* 応答アクション */}
      {actionable && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onAccept}
                disabled={pending}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-base bg-brand-ink px-4 text-sm font-medium text-white transition-colors hover:bg-brand-teal-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {pending ? "処理中…" : "承認する"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("reschedule");
                }}
                disabled={pending}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-4 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                日程を調整
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("decline");
                }}
                disabled={pending}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-4 text-sm font-medium text-state-danger transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                辞退する
              </button>
            </div>
          )}

          {mode === "reschedule" && (
            <form onSubmit={onSubmitReschedule} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor={`slot-${req.id}`}
                  className="block text-sm font-medium text-primary"
                >
                  提案する日時
                </label>
                <Input
                  ref={slotRef}
                  id={`slot-${req.id}`}
                  type="datetime-local"
                  className="mt-1.5 h-11"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor={`msg-${req.id}`}
                  className="block text-sm font-medium text-primary"
                >
                  ひとことコメント
                </label>
                <Textarea
                  ref={messageRef}
                  id={`msg-${req.id}`}
                  className="mt-1.5 min-h-20"
                  maxLength={1000}
                  placeholder="例）ご希望の日程が難しいため、こちらの日時はいかがでしょうか。"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base bg-brand-ink px-4 text-sm font-medium text-white transition-colors hover:bg-brand-teal-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  {pending ? "送信中…" : "この日程を提案"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("idle");
                    setError(null);
                  }}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center rounded-base border border-input px-4 text-sm font-medium text-gray-500 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {mode === "decline" && (
            <form onSubmit={onSubmitDecline} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor={`decline-${req.id}`}
                  className="block text-sm font-medium text-primary"
                >
                  辞退の理由・ひとこと
                </label>
                <Textarea
                  ref={messageRef}
                  id={`decline-${req.id}`}
                  className="mt-1.5 min-h-20"
                  maxLength={1000}
                  placeholder="例）申し訳ございませんが、現在ご希望の形式での対応が難しい状況です。"
                  required
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  {pending ? "送信中…" : "辞退を確定"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("idle");
                    setError(null);
                  }}
                  disabled={pending}
                  className="inline-flex min-h-11 items-center rounded-base border border-input px-4 text-sm font-medium text-gray-500 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
