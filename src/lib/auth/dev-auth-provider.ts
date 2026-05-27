import type { UserRole } from "@prisma/client";
import { isDevAuthEnabled } from "./dev-gate";
import type {
  AuthProvider,
  AuthRequestContext,
  AuthSession,
} from "./types";

/**
 * DevAuthProvider (ADR-3) — development / staging adapter, NOT a mock.
 *
 * Reproduces the 3-role RBAC model (GENERAL / FORTUNE_TELLER / ADMIN) so the
 * full app, RBAC and E2E flows can be built while CC-Auth (OPEN-2) is pending,
 * and so a Vercel STAGING/demo deployment can run without CC-Auth.
 *
 * Defense-in-depth gate (enforced at construction AND in the selector index.ts):
 *   isDevAuthEnabled() ⇔
 *     AUTH_PROVIDER === "dev"
 *     AND ( NODE_ENV !== "production"  OR  ALLOW_DEV_AUTH === "true" )
 *
 * On a real production runtime (prod + no ALLOW_DEV_AUTH opt-in) this adapter
 * still cannot be constructed — the assert below hard-throws — so the dev path
 * remains structurally unreachable in production.
 *
 * Role selection:
 *   - cookie  `dev_role`        (highest priority, set by a dev role switcher)
 *   - header  `x-dev-role`      (useful for E2E / curl)
 *   - どちらも無ければ **null セッション (= 未ログイン)** を返す。
 *
 * 旧仕様 (env `DEV_AUTH_DEFAULT_ROLE` への暗黙フォールバック) は
 * 「/dev/logout してもデフォルトロールで再ログインされたように見える」UX
 * 不具合を生んでいたため廃止 (2026-05-28)。E2E は header `x-dev-role` を明示的に
 * 立てるか、ブラウザフローで /dev/login → role 選択を経るのが正規ルート。
 */

const VALID_ROLES: readonly UserRole[] = [
  "GENERAL",
  "FORTUNE_TELLER",
  "ADMIN",
];

function coerceRole(value: string | undefined): UserRole | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  return (VALID_ROLES as readonly string[]).includes(upper)
    ? (upper as UserRole)
    : null;
}

/** Fixed dev principals per role so seed data / sessions stay consistent. */
const DEV_PRINCIPALS: Record<UserRole, { sub: string; email: string; displayName: string }> = {
  GENERAL: {
    sub: "dev-general",
    email: "dev.general@uranai.local",
    displayName: "開発ユーザー（一般）",
  },
  FORTUNE_TELLER: {
    sub: "dev-fortune-teller",
    email: "dev.advisor@uranai.local",
    displayName: "開発ユーザー（占い師）",
  },
  ADMIN: {
    sub: "dev-admin",
    email: "dev.admin@uranai.local",
    displayName: "開発ユーザー（運営）",
  },
};

export class DevAuthProvider implements AuthProvider {
  readonly name = "dev";

  constructor() {
    // Hard assert (defense-in-depth): this adapter must never be constructed
    // unless the dev path is the active, permitted one. On a true production
    // runtime (prod without the ALLOW_DEV_AUTH staging opt-in) this throws.
    if (!isDevAuthEnabled()) {
      throw new Error(
        "[auth] DevAuthProvider must not be instantiated unless isDevAuthEnabled() " +
          "is true (AUTH_PROVIDER=dev AND (NODE_ENV!=production OR ALLOW_DEV_AUTH=true)) — ADR-3 prod guard."
      );
    }
  }

  async getSession(
    request: AuthRequestContext
  ): Promise<AuthSession | null> {
    // cookie / header いずれも未指定なら **未ログイン** として null を返す。
    // 以前は env DEV_AUTH_DEFAULT_ROLE への暗黙フォールバックがあったが、
    // /dev/logout 後も「勝手にデフォルトロールで再ログインされた」状態になり
    // UX 不具合を生んでいたため廃止 (2026-05-28)。
    const role =
      coerceRole(request.getCookie("dev_role")) ??
      coerceRole(request.getHeader("x-dev-role"));

    if (!role) return null;

    const principal = DEV_PRINCIPALS[role];
    return {
      sub: principal.sub,
      email: principal.email,
      displayName: principal.displayName,
      role,
    };
  }

  getLoginUrl(returnTo?: string): string {
    const target = returnTo ?? "/";
    return `/dev/login?returnTo=${encodeURIComponent(target)}`;
  }

  getLogoutUrl(returnTo?: string): string {
    const target = returnTo ?? "/";
    return `/dev/logout?returnTo=${encodeURIComponent(target)}`;
  }
}
