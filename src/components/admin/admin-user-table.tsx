"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABEL } from "@/components/layout/nav-items";
import { formatPublishedDate, toIsoDate } from "@/lib/format";
import { setUserActive } from "@/lib/actions/admin";
import type { AdminUserView } from "@/lib/queries";

/**
 * 運営: ユーザー一覧 + 有効/無効トグル（ADMIN のみ）.
 * トグルは楽観更新 + サーバ確定。自分自身は無効化不可（サーバ側でも拒否）。
 * email は要配慮ではないが PII。ADMIN のみが見る画面（RBAC で保護済）。
 */
export function AdminUserTable({
  users: initial,
  currentUserId,
}: {
  users: AdminUserView[];
  currentUserId: string;
}) {
  const [users, setUsers] = React.useState(initial);
  React.useEffect(() => setUsers(initial), [initial]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function onToggle(u: AdminUserView) {
    setError(null);
    setBusyId(u.id);
    const next = !u.isActive;
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, isActive: next } : x))
    );
    startTransition(async () => {
      const result = await setUserActive(u.id, next);
      if (!result.ok) {
        setUsers((list) =>
          list.map((x) => (x.id === u.id ? { ...x, isActive: u.isActive } : x))
        );
        setError(
          result.error === "self_forbidden"
            ? "自分自身を無効化することはできません。"
            : "状態の変更に失敗しました。"
        );
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
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th scope="col" className="px-4 py-3 font-medium">表示名</th>
              <th scope="col" className="px-4 py-3 font-medium">メール</th>
              <th scope="col" className="px-4 py-3 font-medium">ロール</th>
              <th scope="col" className="px-4 py-3 font-medium">登録日</th>
              <th scope="col" className="px-4 py-3 font-medium">状態</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-primary">
                    {u.displayName}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-gray-400">(自分)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-500">
                    <time dateTime={toIsoDate(u.createdAt)}>
                      {formatPublishedDate(u.createdAt)}
                    </time>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? "success" : "destructive"}>
                      {u.isActive ? "有効" : "無効"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggle(u)}
                      disabled={busyId === u.id || isSelf}
                      title={isSelf ? "自分自身は変更できません" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-base border border-input px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
                        u.isActive
                          ? "text-state-danger hover:bg-destructive/10"
                          : "text-primary hover:bg-secondary"
                      )}
                    >
                      {u.isActive ? "無効化" : "有効化"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
