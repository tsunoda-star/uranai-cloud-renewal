"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, MessageSquare, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { METHOD_META } from "@/lib/divination";
import { CONSULTATION_STATUS_META } from "@/lib/consultation-status";
import { formatDateTime, toIsoDateTime } from "@/lib/format";
import { cancelMyRequest } from "@/lib/actions/consultation";
import type { MyRequestView } from "@/lib/queries";

const ERROR_MESSAGE: Record<string, string> = {
  unauthenticated: "ログインが必要です。",
  not_found: "リクエストが見つかりませんでした。",
  forbidden: "この操作は許可されていません。",
  invalid_state: "この状態のリクエストは取り消せません。",
};

/**
 * 送信済み予約リクエスト一覧（AC-B8）.
 * 各リクエストの状態・相手・希望日時候補・占い師の応答を表示し、取消可能な状態
 * （受付中 / 日程調整中）のみ「取消」ボタンを出す。要配慮情報（summary）は一覧に
 * 含まれない（§12, getMyRequests が select しない）。取消は所有権をサーバで再検証。
 */
export function RequestList({ requests }: { requests: MyRequestView[] }) {
  if (requests.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-6 text-sm text-gray-500">
        まだ予約リクエストはありません。
        <Link
          href="/advisors"
          className="ml-1 font-medium text-brand-teal-strong hover:underline"
        >
          占い師を探す
        </Link>
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {requests.map((req) => (
        <RequestCard key={req.id} req={req} />
      ))}
    </ul>
  );
}

function RequestCard({ req }: { req: MyRequestView }) {
  const [status, setStatus] = React.useState(req.status);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const statusMeta = CONSULTATION_STATUS_META[status];
  const methodMeta = METHOD_META[req.method];
  const MethodIcon = methodMeta.icon;
  const cancellable =
    status === "PENDING" || status === "RESCHEDULED";

  function onCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelMyRequest(req.id);
      if (result.ok) {
        setStatus("CANCELLED");
      } else {
        setError(ERROR_MESSAGE[result.error ?? ""] ?? "取消に失敗しました。");
      }
    });
  }

  return (
    <li className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Avatar
            name={req.advisor.displayName}
            src={req.advisor.avatarUrl}
            size="md"
          />
          <div className="min-w-0">
            <Link
              href={`/advisors/${req.advisor.slug}`}
              className="font-heading text-h4 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              {req.advisor.displayName}
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <MethodIcon
                  className="h-3.5 w-3.5 text-brand-teal-strong"
                  aria-hidden="true"
                />
                {methodMeta.label}
              </span>
              {req.service && <span>メニュー: {req.service.title}</span>}
              <time dateTime={toIsoDateTime(req.createdAt)} className="tabular-nums">
                {formatDateTime(req.createdAt)} 申込
              </time>
            </p>
          </div>
        </div>
        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
      </div>

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
              <li
                key={i}
                className="text-xs tabular-nums text-gray-600"
              >
                <time dateTime={toIsoDateTime(slot)}>
                  {formatDateTime(slot)}
                </time>
              </li>
            ))}
          </ul>
        </div>
      )}

      {req.responseMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-base border border-gray-200 px-3 py-2.5">
          <MessageSquare
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-gray-600">
            <span className="font-medium text-primary">占い師より：</span>
            {req.responseMessage}
            {req.proposedSlot && (
              <>
                {" "}
                <span className="tabular-nums">
                  （提案日時: {formatDateTime(req.proposedSlot)}）
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

      {cancellable && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-4 text-sm font-medium text-state-danger transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            )}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {pending ? "取消中…" : "リクエストを取り消す"}
          </button>
        </div>
      )}
    </li>
  );
}
