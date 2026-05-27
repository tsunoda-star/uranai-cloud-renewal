import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, AlertCircle } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import { getOwnedAdvisorProfileId, getAdvisorRequests } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { AdvisorRequestList } from "@/components/advisor/advisor-request-list";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "予約リクエスト管理",
  robots: { index: false, follow: false },
};

/**
 * /advisor/requests — 受信リクエスト管理（AC-B7-3/4/5, spec §5.1）.
 *
 * RBAC は requireAdvisor で強制（SEC-2）。一覧は自分の profile.id 起点で取得し、
 * summary（要配慮情報）は宛先占い師＝本人なので含めて表示する（§12, 慎重表示）。
 * ADMIN がアクセスしてもプロフィール未所有なら案内を出す（応答 Action 側で ADMIN は
 * 全件可だが、ダッシュボード一覧は profile.id 基準のため）。
 */
export default async function AdvisorRequestsPage() {
  const user = await requireAdvisor("/advisor/requests");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);

  if (!advisorProfileId) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-heading text-h1 font-bold text-primary">
          予約リクエスト管理
        </h1>
        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-brand-rose-pale bg-brand-rose-pale/40 p-6">
          <AlertCircle
            className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal-strong"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-primary">
              占い師プロフィールが未作成です。
            </p>
            <p className="mt-1 text-sm text-gray-500">
              占い師登録を完了すると、自分宛のリクエストを受信できます。
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/register/advisor">占い師登録を完了する</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const requests = await getAdvisorRequests(advisorProfileId);
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-h1 font-bold text-primary">
            <Inbox
              className="h-7 w-7 text-brand-teal-strong"
              aria-hidden="true"
            />
            予約リクエスト管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            受信した相談リクエストを承認・日程調整・辞退できます。
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/advisor">ダッシュボードへ</Link>
        </Button>
      </header>

      <p className="mt-4 text-sm text-gray-500">
        未対応{" "}
        <span className="font-semibold tabular-nums text-brand-teal-strong">
          {pendingCount}
        </span>{" "}
        件 / 全{" "}
        <span className="font-semibold tabular-nums text-primary">
          {requests.length}
        </span>{" "}
        件
      </p>

      <div
        className="mt-3 rounded-base border border-gray-200 bg-secondary/50 px-4 py-2.5 text-xs text-gray-500"
        role="note"
      >
        相談概要には相談者の個人的な内容が含まれます。取り扱いには十分ご配慮ください。
      </div>

      <div className="mt-6">
        <AdvisorRequestList requests={requests} />
      </div>
    </div>
  );
}
