import { AlertTriangle } from "lucide-react";

import { isStagingDevAuth } from "@/lib/auth/dev-gate";

/**
 * STAGING banner (ADR-3 staging opt-in transparency).
 *
 * Server Component. Renders ONLY when the dev auth adapter is running on a
 * production runtime via the explicit `ALLOW_DEV_AUTH=true` opt-in
 * (`isStagingDevAuth()` — Vercel staging/demo). It makes the open dev login
 * auditable and unmistakable so a staging deployment is never confused with the
 * real production site.
 *
 * It is intentionally absent on:
 *   - local development (NODE_ENV != production) — expected developer surface,
 *   - the true production deployment (no ALLOW_DEV_AUTH) — CcAuthProvider only.
 */
export function StagingBanner() {
  if (!isStagingDevAuth()) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 border-b border-brand-gold bg-brand-gold/15 px-4 py-2 text-center text-sm font-medium text-state-warning-fg"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        ⚠ STAGING / デモ環境（開発用認証が有効）— 本番ではありません
      </span>
    </div>
  );
}
