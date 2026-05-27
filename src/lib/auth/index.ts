import { cookies, headers } from "next/headers";
import type { User } from "@prisma/client";

import { db } from "@/lib/db";
import { CcAuthProvider } from "./cc-auth-provider";
import { DevAuthProvider } from "./dev-auth-provider";
import { isDevAuthEnabled } from "./dev-gate";
import type {
  AuthProvider,
  AuthRequestContext,
  AuthSession,
} from "./types";

export type { AuthProvider, AuthRequestContext, AuthSession } from "./types";

/**
 * Auth adapter selection (ADR-3, staging opt-in extension).
 *
 * The selection predicate lives in ONE place — `isDevAuthEnabled()` in
 * `dev-gate.ts` — and is reused here so the selector, the DevAuthProvider
 * construction assert, the dev route guards and the staging banner can never
 * disagree about whether the dev path is active.
 *
 * Selection rule:
 *   - DevAuthProvider  ⇔  isDevAuthEnabled()  i.e.
 *       AUTH_PROVIDER=dev AND (NODE_ENV!=production OR ALLOW_DEV_AUTH=true)
 *   - CcAuthProvider   in every other case (the production default).
 *
 * True production (AUTH_PROVIDER=dev but no ALLOW_DEV_AUTH opt-in on a prod
 * runtime) is treated as a configuration error: we refuse rather than silently
 * fall back, so an operator who *intended* dev on prod without the audited flag
 * is told loudly instead of getting an unexpected CC-Auth login.
 */
function selectProvider(): AuthProvider {
  if (isDevAuthEnabled()) {
    return new DevAuthProvider();
  }

  const isProd = process.env.NODE_ENV === "production";
  const wantsDev = process.env.AUTH_PROVIDER === "dev";

  if (wantsDev && isProd) {
    // dev requested on a production runtime WITHOUT the explicit ALLOW_DEV_AUTH
    // opt-in: refuse loudly (never honor an unaudited dev request on prod).
    throw new Error(
      "[auth] AUTH_PROVIDER=dev on a production runtime requires the explicit " +
        "ALLOW_DEV_AUTH=true staging opt-in (ADR-3 prod guard). Unset for the " +
        "true production deployment so CcAuthProvider is used instead."
    );
  }

  return new CcAuthProvider();
}

let cachedProvider: AuthProvider | undefined;

/** Lazily constructed, process-cached provider. */
export function getAuthProvider(): AuthProvider {
  if (!cachedProvider) {
    cachedProvider = selectProvider();
  }
  return cachedProvider;
}

/** Build an `AuthRequestContext` from the current Next.js request scope. */
export async function getRequestContext(): Promise<AuthRequestContext> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return {
    getCookie: (name) => cookieStore.get(name)?.value,
    getHeader: (name) => headerStore.get(name) ?? undefined,
  };
}

/** Convenience: resolve the current session (or null) in a server context. */
export async function getCurrentSession(): Promise<AuthSession | null> {
  const provider = getAuthProvider();
  const ctx = await getRequestContext();
  return provider.getSession(ctx);
}

/**
 * Resolve the current session to the backing `User` row (or null).
 *
 * The session principal (`sub`/`email`) is matched against the database so
 * server-side RBAC and ownership checks (SEC-2/3) operate on the real user
 * record — not on the client-supplied claim alone. We look up by the stable
 * `ccAuthSub` first (DevAuthProvider uses a fixed sub per role; CcAuthProvider
 * uses the Cognito sub), falling back to email. Returns null when there is no
 * session or no matching row (e.g. an unseeded principal).
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const bySub = session.sub
    ? await db.user.findUnique({ where: { ccAuthSub: session.sub } })
    : null;
  if (bySub) return bySub;

  if (!session.email) return null;
  return db.user.findUnique({ where: { email: session.email } });
}
