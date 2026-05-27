"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellOff, Megaphone, CalendarHeart, FileText } from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatDateTime, toIsoDateTime } from "@/lib/format";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notification";
import type { NotificationView } from "@/lib/queries";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  CONSULTATION_STATUS: CalendarHeart,
  POST_PUBLISHED: FileText,
  SYSTEM: Megaphone,
};

/**
 * 通知一覧（既読化, AC-B7-6）.
 * 未読は強調表示。各通知をクリック/「既読にする」で既読化（楽観更新）。
 * 「すべて既読」で一括既読化。所有権はサーバ側で userId 制約により保証。
 */
export function NotificationList({
  initialNotifications,
}: {
  initialNotifications: NotificationView[];
}) {
  const [items, setItems] = React.useState(initialNotifications);
  const [pending, startTransition] = React.useTransition();

  const unreadCount = items.filter((n) => !n.isRead).length;

  function markOne(id: string) {
    setItems((list) =>
      list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    void markNotificationRead(id);
  }

  function markAll() {
    const prev = items;
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) setItems(prev); // rollback
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-6 text-sm text-gray-500">
        <BellOff className="mr-1.5 inline h-4 w-4 text-gray-400" aria-hidden="true" />
        通知はありません。
      </p>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            未読 <span className="font-semibold tabular-nums text-primary">{unreadCount}</span> 件
          </p>
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-3 text-sm font-medium text-brand-teal-strong transition-colors hover:bg-brand-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
          >
            すべて既読にする
          </button>
        </div>
      )}

      <ul className="divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-card shadow-base">
        {items.map((n) => {
          const Icon = TYPE_ICON[n.type];
          const body = (
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  n.isRead ? "bg-secondary" : "bg-brand-rose-pale"
                )}
                aria-hidden="true"
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    n.isRead ? "text-gray-400" : "text-brand-teal-strong"
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-medium",
                      n.isRead ? "text-gray-600" : "text-primary"
                    )}
                  >
                    {n.title}
                  </span>
                  {!n.isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-rose-pale px-2 py-0.5 text-[10px] font-semibold text-brand-teal-strong">
                      <Bell className="h-2.5 w-2.5" aria-hidden="true" />
                      新着
                    </span>
                  )}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500">
                    {n.body}
                  </p>
                )}
                <time
                  dateTime={toIsoDateTime(n.createdAt)}
                  className="mt-1 block text-xs tabular-nums text-gray-400"
                >
                  {formatDateTime(n.createdAt)}
                </time>
              </div>
              {!n.isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    markOne(n.id);
                  }}
                  className="shrink-0 self-center rounded-base px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  既読にする
                </button>
              )}
            </div>
          );

          return (
            <li key={n.id} className="p-4">
              {n.linkUrl ? (
                <Link
                  href={n.linkUrl}
                  onClick={() => {
                    if (!n.isRead) markOne(n.id);
                  }}
                  className="block rounded-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
