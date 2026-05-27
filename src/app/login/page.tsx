import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { getAuthProvider } from "@/lib/auth";
import { isDevAuthEnabled } from "@/lib/auth/dev-gate";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ログイン",
  robots: { index: false, follow: false },
};

/**
 * Login entry point (spec §2 `/login`).
 *
 * - Dev (DevAuthProvider / ADR-3): redirect straight to the role switcher
 *   `/dev/login`, preserving returnTo.
 * - Prod (CcAuthProvider): present the CC-Auth sign-in entry (the provider's
 *   getLoginUrl resolves to the CC-Auth flow once OPEN-2 is configured).
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo: returnToRaw } = await searchParams;
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : "/";

  if (isDevAuthEnabled()) {
    redirect(`/dev/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const loginUrl = getAuthProvider().getLoginUrl(returnTo);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center sm:px-6">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-rose-pale"
        aria-hidden="true"
      >
        <Sparkles className="h-8 w-8 text-brand-teal-strong" />
      </span>
      <h1 className="mt-6 font-heading text-h1 font-bold text-primary">
        ログイン
      </h1>
      <p className="mt-3 text-body-lg text-gray-500">
        共通認証（CC-Auth）でログインして、お気に入りや予約リクエストをご利用ください。
      </p>
      <div className="mt-8 w-full">
        <Button asChild size="lg" className="w-full">
          <Link href={loginUrl}>CC-Auth でログイン</Link>
        </Button>
      </div>
    </div>
  );
}
