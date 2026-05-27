import type { Metadata } from "next";
import Link from "next/link";
import { PencilLine, AlertCircle, ExternalLink } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import { getOwnedAdvisorProfileId, getAdvisorOwnProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { AdvisorProfileForm } from "@/components/advisor/advisor-profile-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "プロフィール管理",
  robots: { index: false, follow: false },
};

/**
 * /advisor/profile — 占い師プロフィール管理（AC-B9-1）.
 * RBAC は requireAdvisor で強制（SEC-2）。編集対象は自分の profile のみ（SEC-3, Action 側で
 * userId 制約）。?welcome=1 で登録直後の歓迎バナーを表示。
 */
export default async function AdvisorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireAdvisor("/advisor/profile");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);

  if (!advisorProfileId) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-heading text-h1 font-bold text-primary">
          プロフィール管理
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
              占い師登録を完了するとプロフィールを編集できます。
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

  const profile = await getAdvisorOwnProfile(advisorProfileId);
  if (!profile) {
    // 直前で id が取れているため通常到達しないが、型安全のためのガード。
    return null;
  }

  const sp = await searchParams;
  const justRegistered = sp.welcome === "1";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-h1 font-bold text-primary">
            <PencilLine
              className="h-7 w-7 text-brand-teal-strong"
              aria-hidden="true"
            />
            プロフィール管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            自己紹介・得意占術・対応形式・公開状態を編集できます。
          </p>
        </div>
        {profile.isPublished && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/advisors/${profile.slug}`} target="_blank">
              公開ページを見る
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </header>

      {justRegistered && (
        <p
          role="status"
          className="mt-6 rounded-2xl border border-state-success-fg/30 bg-brand-green/15 px-4 py-3 text-sm text-state-success-fg"
        >
          占い師登録が完了しました。プロフィールを充実させて「公開する」にチェックすると、検索結果に掲載されます。
        </p>
      )}

      <div className="mt-8">
        <AdvisorProfileForm profile={profile} />
      </div>
    </div>
  );
}
