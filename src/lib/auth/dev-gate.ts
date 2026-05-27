/**
 * Dev-auth route gate (ADR-3 — staging opt-in extension).
 *
 * The dev auth path (DevAuthProvider, /dev/login, /dev/logout, the dev role
 * switcher server actions) is the single source of truth for "is the dev
 * adapter the active, permitted path?". This module owns that predicate so the
 * selector (`lib/auth/index.ts`), the DevAuthProvider construction assert, the
 * dev route guards and the staging banner all share ONE definition — there is
 * no second copy to drift.
 *
 * Selection rule (ADR-3, extended for Vercel staging):
 *   dev auth is enabled  ⇔  AUTH_PROVIDER === "dev"
 *                            AND ( NODE_ENV !== "production"   // local dev
 *                                  OR ALLOW_DEV_AUTH === "true" )  // explicit staging opt-in
 *
 * Rationale: Vercel runs with NODE_ENV=production, which (by the original
 * double gate) would always force CcAuthProvider. To run a Vercel STAGING/demo
 * deployment on the dev adapter we require an explicit, auditable opt-in flag
 * (`ALLOW_DEV_AUTH=true`). A *true* production deployment simply omits the flag
 * (or sets anything other than "true") and the dev path stays structurally
 * unreachable exactly as before — no regression.
 */

export const DEV_ROLE_COOKIE = "dev_role";

/** True only when the development auth adapter is the active, permitted path. */
export function isDevAuthEnabled(): boolean {
  const wantsDev = process.env.AUTH_PROVIDER === "dev";
  if (!wantsDev) return false;

  const isProd = process.env.NODE_ENV === "production";
  // Non-prod: always allowed (local development). Prod: only with explicit opt-in.
  const stagingOptIn = process.env.ALLOW_DEV_AUTH === "true";
  return !isProd || stagingOptIn;
}

/**
 * True only when the dev adapter is running on a *production* runtime via the
 * explicit staging opt-in (Vercel demo/staging). This is the condition under
 * which the "⚠ STAGING / demo environment" banner must be shown so the open
 * dev login is auditable and never mistaken for the real production site.
 *
 * On local dev (NODE_ENV!=production) this is false — no banner — because that
 * is the expected developer environment, not a deployed staging surface.
 */
export function isStagingDevAuth(): boolean {
  return (
    process.env.AUTH_PROVIDER === "dev" &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEV_AUTH === "true"
  );
}
