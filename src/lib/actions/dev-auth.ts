"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { DEV_ROLE_COOKIE, isDevAuthEnabled } from "@/lib/auth/dev-gate";

/**
 * Server Actions backing the DevAuthProvider role switcher (ADR-3).
 *
 * Both actions are hard-gated: on a non-dev path they refuse to mutate the
 * session, so the prod build never carries a working role switcher.
 */

const VALID_ROLES: readonly UserRole[] = ["GENERAL", "FORTUNE_TELLER", "ADMIN"];

function sanitizeReturnTo(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "/";
  // Only allow same-origin absolute paths (no protocol-relative, no external).
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}

/** Set the `dev_role` cookie for the chosen role, then redirect to returnTo. */
export async function setDevRole(formData: FormData): Promise<void> {
  if (!isDevAuthEnabled()) {
    throw new Error(
      "[dev-auth] setDevRole is only available on the dev auth path (ADR-3 guard)."
    );
  }

  const roleRaw = formData.get("role");
  const role =
    typeof roleRaw === "string" &&
    (VALID_ROLES as readonly string[]).includes(roleRaw)
      ? (roleRaw as UserRole)
      : null;
  if (!role) {
    throw new Error("[dev-auth] invalid role");
  }

  const returnTo = sanitizeReturnTo(formData.get("returnTo"));

  const store = await cookies();
  store.set(DEV_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false, // dev only (NODE_ENV!=production is enforced by the gate)
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(returnTo);
}

/** Clear the `dev_role` cookie (log out), then redirect to returnTo. */
export async function clearDevRole(formData: FormData): Promise<void> {
  if (!isDevAuthEnabled()) {
    throw new Error(
      "[dev-auth] clearDevRole is only available on the dev auth path (ADR-3 guard)."
    );
  }
  const returnTo = sanitizeReturnTo(formData.get("returnTo"));
  const store = await cookies();
  store.delete(DEV_ROLE_COOKIE);
  redirect(returnTo);
}
