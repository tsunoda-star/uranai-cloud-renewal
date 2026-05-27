"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { setAdvisorPublished } from "@/lib/actions/admin";
import type { AdminAdvisorView } from "@/lib/queries";

/**
 * 運営: 占い師一覧 + 公開/非公開トグル（ADMIN のみ）.
 * トグルは FortuneTellerProfile.isPublished を更新（検索/一覧の可視性に直結）。
 */
export function AdminAdvisorTable({
  advisors: initial,
}: {
  advisors: AdminAdvisorView[];
}) {
  const [advisors, setAdvisors] = React.useState(initial);
  React.useEffect(() => setAdvisors(initial), [initial]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function onToggle(a: AdminAdvisorView) {
    setError(null);
    setBusyId(a.id);
    const next = !a.isPublished;
    setAdvisors((list) =>
      list.map((x) => (x.id === a.id ? { ...x, isPublished: next } : x))
    );
    startTransition(async () => {
      const result = await setAdvisorPublished(a.id, next);
      if (!result.ok) {
        setAdvisors((list) =>
          list.map((x) =>
            x.id === a.id ? { ...x, isPublished: a.isPublished } : x
          )
        );
        setError("公開状態の変更に失敗しました。");
      }
      setBusyId(null);
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base">
      {error && (
        <p role="alert" className="border-b border-gray-200 px-4 py-2 text-sm text-state-danger">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th scope="col" className="px-4 py-3 font-medium">占い師</th>
              <th scope="col" className="px-4 py-3 font-medium">サービス</th>
              <th scope="col" className="px-4 py-3 font-medium">リクエスト</th>
              <th scope="col" className="px-4 py-3 font-medium">アカウント</th>
              <th scope="col" className="px-4 py-3 font-medium">公開状態</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {advisors.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-primary">
                  <Link
                    href={`/advisors/${a.slug}`}
                    target="_blank"
                    className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
                  >
                    {a.displayName}
                  </Link>
                  <span className="ml-1.5 text-xs text-gray-400">/{a.slug}</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-500">
                  {a.serviceCount}
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-500">
                  {a.requestCount}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={a.userIsActive ? "success" : "destructive"}>
                    {a.userIsActive ? "有効" : "無効"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={a.isPublished ? "success" : "secondary"}>
                    {a.isPublished ? "公開中" : "非公開"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onToggle(a)}
                    disabled={busyId === a.id}
                    className={cn(
                      "inline-flex min-h-11 items-center rounded-base border border-input px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                      a.isPublished
                        ? "text-state-danger hover:bg-destructive/10"
                        : "text-primary hover:bg-secondary"
                    )}
                  >
                    {a.isPublished ? "非公開にする" : "公開する"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
