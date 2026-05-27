import { redirect } from "next/navigation";
import type { User } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";

/**
 * Server-side RBAC guards for protected route groups (spec §3, SEC-2).
 *
 * These run in Server Components (page/layout) before any data fetch. They never
 * rely on client state. A missing session redirects to /login?returnTo=...; a
 * role mismatch redirects to a sensible home (mypage / advisor / admin) so users
 * are not stranded. Ownership (SEC-3) is enforced separately in queries/actions
 * via the resolved profile/user id, not here.
 */

/** Where a non-eligible authenticated user should land (their own home). */
function homeForRole(user: User): string {
  switch (user.role) {
    case "FORTUNE_TELLER":
      return "/advisor";
    case "ADMIN":
      return "/admin";
    default:
      return "/mypage";
  }
}

/**
 * Require FORTUNE_TELLER or ADMIN for /advisor/*. Returns the authenticated
 * user. GENERAL is redirected to /mypage; unauthenticated to /login.
 */
export async function requireAdvisor(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "FORTUNE_TELLER" && user.role !== "ADMIN") {
    redirect(homeForRole(user));
  }
  return user;
}

/**
 * Require ADMIN for /admin/*. Returns the authenticated user. Non-admin is
 * redirected to their own home; unauthenticated to /login.
 */
export async function requireAdmin(returnTo: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== "ADMIN") {
    redirect(homeForRole(user));
  }
  return user;
}
