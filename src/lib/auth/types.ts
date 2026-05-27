import type { UserRole } from "@prisma/client";

/**
 * Authentication adapter contract (ADR-3).
 *
 * The application depends only on `AuthProvider`. Concrete implementations:
 * - `CcAuthProvider`  — production, CC-Auth (Cognito) backed (enabled after OPEN-2).
 * - `DevAuthProvider` — local development only, double-gated (AUTH_PROVIDER=dev
 *   AND NODE_ENV!=production). NOT a mock: a swappable development adapter.
 */

/** Authenticated principal as the app understands it. */
export interface AuthSession {
  /** Stable subject id (CC-Auth `sub`, or a dev-fixed id for DevAuthProvider). */
  sub: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface AuthProvider {
  /** Human-readable adapter id (for diagnostics / logging without PII). */
  readonly name: string;

  /**
   * Resolve the current session for an incoming request, or null when there is
   * no authenticated principal. Implementations must never throw on the
   * "not authenticated" path — return null instead.
   */
  getSession(request: AuthRequestContext): Promise<AuthSession | null>;

  /** Login entry point URL (where the UI should redirect to begin auth). */
  getLoginUrl(returnTo?: string): string;

  /** Logout entry point URL. */
  getLogoutUrl(returnTo?: string): string;
}

/**
 * Minimal request context an adapter needs. Kept framework-light so it can be
 * fed from Next.js Route Handlers, Server Actions, or middleware.
 */
export interface AuthRequestContext {
  /** Lazy cookie accessor: name -> value | undefined. */
  getCookie: (name: string) => string | undefined;
  /** Lazy header accessor: name (lowercased) -> value | undefined. */
  getHeader: (name: string) => string | undefined;
}
