import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { User, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import type { UserRole } from "@prisma/client";

import { isDevAuthEnabled } from "@/lib/auth/dev-gate";
import { getCurrentSession } from "@/lib/auth";
import { setDevRole, clearDevRole } from "@/lib/actions/dev-auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "開発ログイン",
  robots: { index: false, follow: false },
};

const ROLE_CHOICES: ReadonlyArray<{
  role: UserRole;
  label: string;
  description: string;
  principal: string;
  icon: typeof User;
}> = [
  {
    role: "GENERAL",
    label: "一般ユーザー（Seeker）",
    description: "占い師の検索・お気に入り・予約リクエスト送信ができます。",
    principal: "開発ユーザー（一般） / dev.general@uranai.local",
    icon: User,
  },
  {
    role: "FORTUNE_TELLER",
    label: "占い師（Advisor）",
    description: "自分宛の予約リクエスト受信・プロフィール/記事管理ができます。",
    principal: "開発ユーザー（占い師） / dev.advisor@uranai.local",
    icon: Sparkles,
  },
  {
    role: "ADMIN",
    label: "運営管理者",
    description: "占い師・ユーザー・サービス・ブログの全件管理ができます。",
    principal: "開発ユーザー（運営） / dev.admin@uranai.local",
    icon: ShieldCheck,
  },
];

export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  // ADR-3 二重ガード: 本番経路にこのページは存在させない。
  if (!isDevAuthEnabled()) notFound();

  const { returnTo: returnToRaw } = await searchParams;
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : "/";

  const session = await getCurrentSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="rounded-3xl border border-brand-rose-pale bg-brand-rose-pale/40 px-4 py-3 text-sm text-brand-teal-strong">
        開発用のロール切替（DevAuthProvider / ADR-3）。本番（CC-Auth）では表示されません。
      </div>

      <h1 className="mt-8 font-heading text-h1 font-bold text-primary">
        開発ログイン
      </h1>
      <p className="mt-2 text-body-lg text-gray-500">
        確認したいロールを選んでください。選んだロールのセッション Cookie を設定します。
      </p>

      {session && (
        <p className="mt-4 text-sm text-gray-500">
          現在のロール:{" "}
          <span className="font-semibold text-primary">{session.displayName}</span>
          （{session.role}）
        </p>
      )}

      <ul className="mt-8 flex flex-col gap-4">
        {ROLE_CHOICES.map((choice) => {
          const Icon = choice.icon;
          const isCurrent = session?.role === choice.role;
          return (
            <li key={choice.role}>
              <form action={setDevRole}>
                <input type="hidden" name="role" value={choice.role} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  aria-current={isCurrent ? "true" : undefined}
                  className="flex min-h-11 w-full items-start gap-4 rounded-2xl border border-gray-200 bg-card p-5 text-left shadow-base transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[current=true]:border-brand-teal"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-rose-pale"
                    aria-hidden="true"
                  >
                    <Icon className="h-6 w-6 text-brand-teal-strong" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-heading text-h4 font-semibold text-primary">
                      {choice.label}
                      {isCurrent && (
                        <span className="rounded-full bg-brand-rose-pale px-2 py-0.5 text-xs font-medium text-brand-teal-strong">
                          ログイン中
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      {choice.description}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {choice.principal}
                    </span>
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {session && (
          <form action={clearDevRole}>
            <input type="hidden" name="returnTo" value="/dev/login" />
            <Button type="submit" variant="outline" size="sm">
              ログアウト
            </Button>
          </form>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={returnTo}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            戻る
          </Link>
        </Button>
      </div>
    </div>
  );
}
