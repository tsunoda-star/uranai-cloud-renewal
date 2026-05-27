import { NextResponse, type NextRequest } from "next/server";

import { DEV_ROLE_COOKIE, isDevAuthEnabled } from "@/lib/auth/dev-gate";

/**
 * Dev logout (ADR-3). Clears the `dev_role` cookie and redirects to `returnTo`.
 * Reached via DevAuthProvider.getLogoutUrl() = `/dev/logout?returnTo=...`.
 * Hard-gated: outside the dev auth path it 404s (no prod logout endpoint here).
 */
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): NextResponse {
  if (!isDevAuthEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const returnToRaw = request.nextUrl.searchParams.get("returnTo");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//")
      ? returnToRaw
      : "/";

  const res = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
  res.cookies.delete(DEV_ROLE_COOKIE);
  return res;
}
