import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Heart, CalendarClock, Bell, UserCog } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import {
  getFavoriteAdvisors,
  getMyRequests,
  getNotifications,
} from "@/lib/queries";
import { RequestList } from "@/components/mypage/request-list";
import { FavoriteList } from "@/components/mypage/favorite-list";
import { ProfileEditForm } from "@/components/mypage/profile-edit-form";
import { NotificationList } from "@/components/mypage/notification-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "マイページ",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /mypage — 一般ユーザーマイページ（AC-B8, spec §2 要認証 GENERAL）.
 *
 * RBAC (SEC-2): 未認証は /login?returnTo=/mypage、GENERAL 以外（占い師/運営）は
 * 各自のダッシュボードへ誘導。表示は本人データのみ（getCurrentUser の id で取得）。
 * 予約直後は ?booked=1 で確認バナーを出す（Server Action redirect 先）。
 */
export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/mypage");
  }
  // GENERAL 専用ページ（spec §2）。他ロールは適切な導線へ。
  if (user.role !== "GENERAL") {
    redirect(user.role === "FORTUNE_TELLER" ? "/advisor/requests" : "/admin");
  }

  const sp = await searchParams;
  const justBooked = first(sp.booked) === "1";

  const [requests, favorites, notifications] = await Promise.all([
    getMyRequests(user.id),
    getFavoriteAdvisors(user.id),
    getNotifications(user.id),
  ]);

  return (
    <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
      <header>
        <h1 className="font-heading text-h1 font-bold text-primary">
          マイページ
        </h1>
        <p className="mt-2 text-body-lg text-gray-500">
          {user.displayName} さん、こんにちは。お気に入りや予約リクエストを管理できます。
        </p>
      </header>

      {justBooked && (
        <p
          role="status"
          className="mt-6 flex items-start gap-2 rounded-2xl border border-state-success-fg/30 bg-brand-green/15 px-4 py-3 text-sm text-state-success-fg"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          予約リクエストを送信しました。占い師の承認をお待ちください。
        </p>
      )}

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-12">
          {/* 予約リクエスト */}
          <section aria-labelledby="requests-heading">
            <h2
              id="requests-heading"
              className="flex items-center gap-2 font-heading text-h3 font-semibold text-primary"
            >
              <CalendarClock
                className="h-5 w-5 text-brand-teal-strong"
                aria-hidden="true"
              />
              予約リクエスト
            </h2>
            <div className="mt-5">
              <RequestList requests={requests} />
            </div>
          </section>

          {/* お気に入り */}
          <section aria-labelledby="favorites-heading">
            <h2
              id="favorites-heading"
              className="flex items-center gap-2 font-heading text-h3 font-semibold text-primary"
            >
              <Heart
                className="h-5 w-5 text-brand-teal-strong"
                aria-hidden="true"
              />
              お気に入りの占い師
            </h2>
            <div className="mt-5">
              <FavoriteList initialFavorites={favorites} />
            </div>
          </section>
        </div>

        {/* サイドレール: 通知 + プロフィール */}
        <aside className="flex flex-col gap-12">
          <section aria-labelledby="notifications-heading">
            <h2
              id="notifications-heading"
              className="flex items-center gap-2 font-heading text-h3 font-semibold text-primary"
            >
              <Bell
                className="h-5 w-5 text-brand-teal-strong"
                aria-hidden="true"
              />
              通知
            </h2>
            <div className="mt-5">
              <NotificationList initialNotifications={notifications} />
            </div>
          </section>

          <section aria-labelledby="profile-heading">
            <h2
              id="profile-heading"
              className="flex items-center gap-2 font-heading text-h3 font-semibold text-primary"
            >
              <UserCog
                className="h-5 w-5 text-brand-teal-strong"
                aria-hidden="true"
              />
              プロフィール
            </h2>
            <div className="mt-5 rounded-2xl border border-gray-200 bg-card p-6 shadow-base">
              <ProfileEditForm currentDisplayName={user.displayName} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
