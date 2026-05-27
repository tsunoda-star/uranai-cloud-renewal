import Link from "next/link";
import { UserPlus, MessagesSquare, CalendarCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FadeIn } from "./fade-in";

/**
 * 3-step "how it works" CTA (登録 → 相談/マッチング → 予約), brighty-style.
 * Steps are connected on lg+ by a subtle rule; numbers use tabular-nums.
 */
const STEPS: ReadonlyArray<{
  step: number;
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    step: 1,
    title: "登録する",
    body: "無料アカウントを作成。お悩みや希望の占術を登録して準備完了です。",
    icon: UserPlus,
  },
  {
    step: 2,
    title: "相談・マッチング",
    body: "占い師を検索、または条件マッチングで相性のよい相談相手を見つけます。",
    icon: MessagesSquare,
  },
  {
    step: 3,
    title: "予約する",
    body: "希望日時と相談形式を選んで予約リクエスト。占い師の承認で確定します。",
    icon: CalendarCheck,
  },
];

export function CtaThreeStep() {
  return (
    <section aria-labelledby="how-it-works" className="bg-background">
      <div className="mx-auto max-w-container px-4 py-16 sm:px-6 lg:py-24">
        <FadeIn variant="scroll">
          <div className="mx-auto max-w-content text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal-strong">
              How it works
            </p>
            <h2
              id="how-it-works"
              className="mt-2 text-balance font-heading text-h1 font-bold text-primary"
            >
              はじめての方も、3ステップで簡単
            </h2>
            <p className="mt-3 text-balance text-body-lg text-gray-500">
              登録から予約まで、迷わず進められます。
            </p>
          </div>
        </FadeIn>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <FadeIn as="li" variant="scroll" index={i} key={s.step}>
                <div className="flex h-full flex-col items-start gap-4 rounded-2xl border border-gray-200 bg-card p-7 shadow-base">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-rose-pale"
                      aria-hidden="true"
                    >
                      <Icon className="h-6 w-6 text-brand-teal-strong" />
                    </span>
                    <span className="font-heading text-sm font-semibold tabular-nums text-gray-400">
                      STEP {s.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-h3 font-semibold text-primary">
                    {s.title}
                  </h3>
                  <p className="text-base leading-relaxed text-gray-500">
                    {s.body}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </ol>

        <FadeIn variant="scroll" index={3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="font-semibold">
              <Link href="/advisors">占い師を探す</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/register/advisor">占い師として登録する</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
