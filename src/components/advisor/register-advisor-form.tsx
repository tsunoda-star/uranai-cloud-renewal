"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  registerAsAdvisor,
  type RegisterAdvisorState,
} from "@/lib/actions/register-advisor";

const initialState: RegisterAdvisorState = { ok: false };

function SubmitButton({ devMode }: { devMode: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      <Sparkles className="h-5 w-5" aria-hidden="true" />
      {pending
        ? "処理中…"
        : devMode
          ? "占い師として登録する"
          : "登録を申請する"}
    </Button>
  );
}

/**
 * 占い師登録フォーム（AC-A2-2）.
 * dev では Action が /advisor/profile?welcome=1 へ redirect（成功 state は返らない）。
 * 本番骨子では申請受付 state（applied）を表示する。
 */
export function RegisterAdvisorForm({ devMode }: { devMode: boolean }) {
  const [state, formAction] = useActionState(registerAsAdvisor, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-base border border-state-danger/30 bg-destructive/10 px-4 py-3 text-sm text-state-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.applied && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-base border border-state-success-fg/30 bg-brand-green/15 px-4 py-3 text-sm text-state-success-fg"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          登録申請を受け付けました。共通認証基盤との連携・審査完了後にご案内します。
        </p>
      )}

      {!state.applied && <SubmitButton devMode={devMode} />}
    </form>
  );
}
