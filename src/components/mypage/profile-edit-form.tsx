"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  updateMyProfile,
  type ProfileActionState,
} from "@/lib/actions/profile";

const initialState: ProfileActionState = { ok: false };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中…" : "変更を保存"}
    </Button>
  );
}

/**
 * 最小プロフィール編集（表示名, AC-B8）.
 * 自分の User 行のみ更新（サーバ側で getCurrentUser の id を使用）。保存成功時に
 * インライン確認を表示する。
 */
export function ProfileEditForm({
  currentDisplayName,
}: {
  currentDisplayName: string;
}) {
  const [state, formAction] = useActionState(updateMyProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-base border border-state-danger/30 bg-destructive/10 px-4 py-3 text-sm text-state-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.saved && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-base border border-state-success-fg/30 bg-brand-green/15 px-4 py-3 text-sm text-state-success-fg"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          プロフィールを更新しました。
        </p>
      )}

      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-primary"
        >
          表示名
        </label>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={currentDisplayName}
          required
          maxLength={50}
          className="mt-2 h-11"
          aria-describedby={
            state.fieldErrors?.displayName ? "displayName-error" : undefined
          }
        />
        {state.fieldErrors?.displayName && (
          <p
            id="displayName-error"
            className="mt-1.5 text-xs text-state-danger"
          >
            {state.fieldErrors.displayName}
          </p>
        )}
      </div>

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
