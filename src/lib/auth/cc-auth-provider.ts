import type { UserRole } from "@prisma/client";
import type {
  AuthProvider,
  AuthRequestContext,
  AuthSession,
} from "./types";

/**
 * CcAuthProvider (ADR-3) — production adapter backed by CC-Auth (Cognito).
 *
 * This is the production code path. It is configuration-driven via the
 * CC_AUTH_* environment variables. Those are populated once OPEN-2 (cc_auth
 * settings in .ccagi.yml) is resolved; until then the constructor fails fast
 * with an actionable error rather than silently degrading.
 *
 * Session resolution maps a verified CC-Auth identity token to the app's
 * `AuthSession`. The custom claim `custom:role` (Cognito attribute) is mapped
 * to `UserRole`; verification of the JWT signature against the Cognito JWKS is
 * performed by `verifyIdToken` once the issuer/JWKS wiring is enabled.
 */

interface CcAuthConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  issuer: string;
}

function readConfig(): CcAuthConfig {
  const userPoolId = process.env.CC_AUTH_USER_POOL_ID ?? "";
  const clientId = process.env.CC_AUTH_CLIENT_ID ?? "";
  const region = process.env.CC_AUTH_REGION ?? "";
  const issuer =
    process.env.CC_AUTH_ISSUER ||
    (userPoolId && region
      ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
      : "");

  const missing: string[] = [];
  if (!userPoolId) missing.push("CC_AUTH_USER_POOL_ID");
  if (!clientId) missing.push("CC_AUTH_CLIENT_ID");
  if (!region) missing.push("CC_AUTH_REGION");
  if (missing.length > 0) {
    throw new Error(
      `[auth] CcAuthProvider is not configured. Missing: ${missing.join(
        ", "
      )}. Set these once OPEN-2 (cc_auth) is resolved.`
    );
  }
  return { userPoolId, clientId, region, issuer };
}

const ROLE_CLAIM = "custom:role";

function mapRole(claim: unknown): UserRole {
  const value = typeof claim === "string" ? claim.toUpperCase() : "";
  switch (value) {
    case "ADMIN":
      return "ADMIN";
    case "FORTUNE_TELLER":
      return "FORTUNE_TELLER";
    default:
      return "GENERAL";
  }
}

export class CcAuthProvider implements AuthProvider {
  readonly name = "cc-auth";

  private readonly config: CcAuthConfig;

  constructor() {
    // Fail fast at construction if CC-Auth is not yet configured (OPEN-2).
    this.config = readConfig();
  }

  async getSession(
    request: AuthRequestContext
  ): Promise<AuthSession | null> {
    // CC-Auth issues an id token; the platform sets it as a cookie / Authorization header.
    const bearer = request.getHeader("authorization");
    const token =
      (bearer?.toLowerCase().startsWith("bearer ")
        ? bearer.slice(7)
        : undefined) ?? request.getCookie("cc_id_token");

    if (!token) return null;

    const claims = await this.verifyIdToken(token);
    if (!claims) return null;

    return {
      sub: String(claims.sub),
      email: String(claims.email ?? ""),
      displayName: String(
        claims.name ?? claims["cognito:username"] ?? claims.email ?? "user"
      ),
      role: mapRole(claims[ROLE_CLAIM]),
    };
  }

  getLoginUrl(returnTo?: string): string {
    const target = returnTo ?? "/";
    return `/api/auth/login?returnTo=${encodeURIComponent(target)}`;
  }

  getLogoutUrl(returnTo?: string): string {
    const target = returnTo ?? "/";
    return `/api/auth/logout?returnTo=${encodeURIComponent(target)}`;
  }

  /**
   * Verify a CC-Auth (Cognito) id token against the user pool JWKS and validate
   * issuer / audience. The JWKS fetch + RS256 verification is wired here once
   * OPEN-2 is resolved; until then a configured-but-unverifiable token resolves
   * to no session (fail-closed), never a forged identity.
   */
  private async verifyIdToken(
    token: string
  ): Promise<Record<string, unknown> | null> {
    // Fail-closed: a non-empty token is required, but signature/JWKS verification
    // against `this.config.issuer` is only enabled when CC-Auth goes live
    // (OPEN-2). Until then any token resolves to no session — never a forged
    // identity. `token`/`config` are referenced so the contract is explicit.
    if (token.length === 0) return null;
    void this.config;
    return null;
  }
}
