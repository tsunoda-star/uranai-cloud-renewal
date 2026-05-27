import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getBookingTarget } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { BookingRequestForm } from "@/components/booking/booking-request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "予約をリクエスト",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * /booking/new?advisor=[slug]&service=[id?] （AC-B7, spec §4.1）.
 *
 * 要ログイン。未ログインは /login?returnTo へ（returnTo に元 URL を保持）。
 * 対象占い師が未存在/非公開なら 404。サービス指定は当該占い師の公開サービスのみ
 * 既定選択として渡す（不正値は無視。最終検証は Server Action 側）。
 */
export default async function BookingNewPage({
  searchParams,
}: {
  searchParams: Promise<{ advisor?: string; service?: string }>;
}) {
  const sp = await searchParams;
  const advisorSlug = first(sp.advisor)?.trim();
  const serviceId = first(sp.service)?.trim();

  // advisor 指定が無ければ占い師一覧へ誘導。
  if (!advisorSlug) {
    redirect("/advisors");
  }

  const returnTo = `/booking/new?advisor=${encodeURIComponent(advisorSlug)}${
    serviceId ? `&service=${encodeURIComponent(serviceId)}` : ""
  }`;

  // 要ログイン（spec §4.1）。未ログインは returnTo 付きで /login へ。
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const target = await getBookingTarget(advisorSlug);
  if (!target) notFound();

  // service 既定は当該占い師の公開サービスのみ許可（不正は無視）。
  const validDefaultService =
    serviceId && target.services.some((s) => s.id === serviceId)
      ? serviceId
      : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
      <nav aria-label="パンくず" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link
              href={`/advisors/${target.slug}`}
              className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-base"
            >
              {target.displayName}
            </Link>
          </li>
          <li aria-hidden="true">
            <ChevronRight className="h-4 w-4" />
          </li>
          <li className="font-medium text-primary" aria-current="page">
            予約リクエスト
          </li>
        </ol>
      </nav>

      <header className="mt-6 flex items-center gap-4">
        <Avatar
          name={target.displayName}
          src={target.avatarUrl}
          alt={`${target.displayName}のプロフィール写真`}
          size="lg"
        />
        <div>
          <h1 className="font-heading text-h1 font-bold text-primary">
            予約をリクエスト
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {target.displayName} さんへ日程と相談内容を打診します。
          </p>
        </div>
      </header>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-card p-6 shadow-base sm:p-8">
        <BookingRequestForm
          target={target}
          defaultServiceId={validDefaultService}
        />
      </div>
    </div>
  );
}
