import type { Metadata } from "next";
import Link from "next/link";
import { Settings2, AlertCircle } from "lucide-react";

import { requireAdvisor } from "@/lib/auth/rbac";
import {
  getOwnedAdvisorProfileId,
  getAdvisorOwnServices,
  getAllCategoriesForForm,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { AdvisorServiceManager } from "@/components/advisor/advisor-service-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "サービス管理",
  robots: { index: false, follow: false },
};

/**
 * /advisor/services — サービス管理（AC-B9-2）.
 * RBAC は requireAdvisor で強制（SEC-2）。一覧/編集対象は自分のサービスのみ（SEC-3,
 * Action 側で advisorId 再解決）。公開トグルは検索/一覧の可視性に直結（spec §4.1）。
 */
export default async function AdvisorServicesPage() {
  const user = await requireAdvisor("/advisor/services");
  const advisorProfileId = await getOwnedAdvisorProfileId(user.id);

  if (!advisorProfileId) {
    return (
      <div className="mx-auto max-w-container px-4 py-12 sm:px-6 lg:py-16">
        <h1 className="font-heading text-h1 font-bold text-primary">
          サービス管理
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
              占い師登録を完了するとサービスを登録できます。
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

  const [services, categories] = await Promise.all([
    getAdvisorOwnServices(advisorProfileId),
    getAllCategoriesForForm(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-h1 font-bold text-primary">
            <Settings2
              className="h-7 w-7 text-brand-teal-strong"
              aria-hidden="true"
            />
            サービス管理
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            鑑定メニューの登録・編集・公開設定を行えます。
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/advisor">ダッシュボードへ</Link>
        </Button>
      </header>

      <div className="mt-8">
        <AdvisorServiceManager
          services={services}
          categories={categories}
        />
      </div>
    </div>
  );
}
