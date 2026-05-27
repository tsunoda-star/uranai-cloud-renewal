import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  Inbox,
  PencilLine,
  Settings2,
  CheckCircle2,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/auth/dev-gate";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { RegisterAdvisorForm } from "@/components/advisor/register-advisor-form";

export const metadata: Metadata = {
  title: "占い師として登録",
  description:
    "占いクラウドで占い師として活動しませんか。プロフィール・鑑定メニューを公開し、相談リクエストを受けられます。",
};

const BENEFITS: ReadonlyArray<{ icon: typeof Sparkles; title: string; body: string }> = [
  {
    icon: PencilLine,
    title: "プロフィール公開",
    body: "得意な占術や経歴を掲載し、相談者にあなたの強みを伝えられます。",
  },
  {
    icon: Settings2,
    title: "鑑定メニュー管理",
    body: "相談形式・価格・所要時間を自由に設定し、公開/非公開を切り替えできます。",
  },
  {
    icon: Inbox,
    title: "予約リクエスト受信",
    body: "相談リクエストを受け取り、承認・日程調整・辞退で柔軟に対応できます。",
  },
];

/**
 * /register/advisor — 占い師登録導線（AC-A2-2, spec §3）.
 *
 * - 未認証: 案内 + ログイン導線。
 * - 認証済み（占い師プロフィール所有）: ダッシュボードへ。
 * - 認証済み（未所有）: dev は即時登録フロー、本番は申請フォーム骨子（OPEN-2 CC-Auth 連携前提）。
 */
export default async function RegisterAdvisorPage() {
  const user = await getCurrentUser();

  // 既に占い師プロフィールを持つ → ダッシュボードへ。
  if (user) {
    const profile = await db.fortuneTellerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (profile) redirect("/advisor");
  }

  const devMode = isDevAuthEnabled();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-20">
      <header className="text-center">
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-rose-pale"
          aria-hidden="true"
        >
          <Sparkles className="h-7 w-7 text-brand-teal-strong" />
        </span>
        <h1 className="mt-5 font-heading text-h1 font-bold text-primary">
          占い師として登録
        </h1>
        <p className="mt-3 text-body-lg text-gray-500">
          あなたの占術で、悩みを抱える方の力になりませんか。
          プロフィールと鑑定メニューを公開し、相談リクエストを受けられます。
        </p>
      </header>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <li
              key={b.title}
              className="rounded-2xl border border-gray-200 bg-card p-5 shadow-base"
            >
              <Icon
                className="h-6 w-6 text-brand-teal-strong"
                aria-hidden="true"
              />
              <p className="mt-3 font-heading text-h4 font-semibold text-primary">
                {b.title}
              </p>
              <p className="mt-1 text-sm text-gray-500">{b.body}</p>
            </li>
          );
        })}
      </ul>

      <section className="mt-10 rounded-2xl border border-gray-200 bg-card p-6 shadow-base sm:p-8">
        {!user ? (
          <div className="text-center">
            <p className="text-sm text-gray-500">
              登録にはログインが必要です。ログイン後、このページから登録を完了できます。
            </p>
            <div className="mt-5">
              <Button asChild size="lg">
                <Link href="/login?returnTo=/register/advisor">
                  ログインして登録する
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-heading text-h3 font-semibold text-primary">
              登録を完了する
            </h2>
            {devMode ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle2
                  className="h-4 w-4 text-brand-teal-strong"
                  aria-hidden="true"
                />
                開発環境では、いまのアカウントを占い師として有効化し、プロフィールの編集に進めます。
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                共通認証基盤（CC-Auth）と連携後、運営審査を経て占い師として有効化されます。
                以下のボタンで登録申請を受け付けます。
              </p>
            )}
            <div className="mt-5">
              <RegisterAdvisorForm devMode={devMode} />
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-gray-400">
        ※ 実鑑定・決済機能は次フェーズで提供予定です。
      </p>
    </div>
  );
}
