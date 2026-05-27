"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { METHOD_META } from "@/lib/divination";
import {
  updateAdvisorProfile,
  type AdvisorProfileActionState,
} from "@/lib/actions/advisor-profile";
import type { AdvisorOwnProfileView } from "@/lib/queries";

const initialState: AdvisorProfileActionState = { ok: false };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "保存中…" : "プロフィールを保存"}
    </Button>
  );
}

/**
 * 占い師プロフィール編集フォーム（AC-B9-1）.
 * bio/experience/photoUrl/得意占術（主占術ラジオ）/対応形式/公開状態を編集。
 * 検証・サニタイズ・所有権はすべて Server Action 側で強制。
 */
export function AdvisorProfileForm({
  profile,
}: {
  profile: AdvisorOwnProfileView;
}) {
  const [state, formAction] = useActionState(updateAdvisorProfile, initialState);

  // 主占術の選択状態（選択中カテゴリのみ主占術に設定可能）。
  const initialPrimary =
    profile.categories.find((c) => c.isPrimary)?.id ??
    profile.categories.find((c) => c.selected)?.id ??
    "";
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(profile.categories.filter((c) => c.selected).map((c) => c.id))
  );
  const [primary, setPrimary] = React.useState<string>(initialPrimary);

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primary === id) {
          const first = [...next][0] ?? "";
          setPrimary(first);
        }
      } else {
        next.add(id);
        if (!primary) setPrimary(id);
      }
      return next;
    });
  }

  const fe = state.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
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

      {/* 自己紹介 */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-primary">
          自己紹介・経歴
        </label>
        <Textarea
          id="bio"
          name="bio"
          required
          minLength={20}
          maxLength={2000}
          defaultValue={profile.bio}
          className="mt-2 min-h-32"
          aria-describedby={fe?.bio ? "bio-error" : undefined}
        />
        {fe?.bio && (
          <p id="bio-error" className="mt-1.5 text-xs text-state-danger">
            {fe.bio}
          </p>
        )}
      </div>

      {/* 活動実績 */}
      <div>
        <label
          htmlFor="experience"
          className="block text-sm font-medium text-primary"
        >
          活動実績（任意）
        </label>
        <Textarea
          id="experience"
          name="experience"
          maxLength={1000}
          defaultValue={profile.experience ?? ""}
          className="mt-2 min-h-20"
          placeholder="例）鑑定歴10年。延べ5,000件以上の相談実績。"
          aria-describedby={fe?.experience ? "experience-error" : undefined}
        />
        {fe?.experience && (
          <p id="experience-error" className="mt-1.5 text-xs text-state-danger">
            {fe.experience}
          </p>
        )}
      </div>

      {/* 写真URL */}
      <div>
        <label
          htmlFor="photoUrl"
          className="block text-sm font-medium text-primary"
        >
          プロフィール写真URL（任意）
        </label>
        <Input
          id="photoUrl"
          name="photoUrl"
          type="url"
          inputMode="url"
          defaultValue={profile.photoUrl ?? ""}
          className="mt-2 h-11"
          placeholder="https://example.com/photo.jpg"
          aria-describedby={fe?.photoUrl ? "photoUrl-error" : undefined}
        />
        {fe?.photoUrl && (
          <p id="photoUrl-error" className="mt-1.5 text-xs text-state-danger">
            {fe.photoUrl}
          </p>
        )}
      </div>

      {/* 得意占術 + 主占術 */}
      <fieldset>
        <legend className="text-sm font-medium text-primary">得意な占術</legend>
        <p className="mt-1 text-xs text-gray-500">
          複数選択できます。チェックした中から「主占術」を1つ選んでください。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {profile.categories.map((c) => {
            const isSelected = selected.has(c.id);
            return (
              <div
                key={c.id}
                className="flex flex-col gap-1 rounded-base border border-input p-2.5"
              >
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-primary">
                  <input
                    type="checkbox"
                    name="categoryId"
                    value={c.id}
                    checked={isSelected}
                    onChange={() => toggleCategory(c.id)}
                    className="h-4 w-4 accent-brand-teal"
                  />
                  {c.name}
                </label>
                {isSelected && (
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="radio"
                      name="primaryCategoryId"
                      value={c.id}
                      checked={primary === c.id}
                      onChange={() => setPrimary(c.id)}
                      className="h-3.5 w-3.5 accent-brand-teal"
                    />
                    主占術にする
                  </label>
                )}
              </div>
            );
          })}
        </div>
        {fe?.categories && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.categories}</p>
        )}
      </fieldset>

      {/* 対応相談形式 */}
      <fieldset>
        <legend className="text-sm font-medium text-primary">
          対応する相談形式
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.methods.map((m) => {
            const meta = METHOD_META[m.method];
            const Icon = meta.icon;
            return (
              <label
                key={m.method}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-base border border-input px-4 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[:checked]:border-brand-teal has-[:checked]:bg-brand-rose-pale has-[:checked]:text-brand-teal-strong"
              >
                <input
                  type="checkbox"
                  name="method"
                  value={m.method}
                  defaultChecked={m.selected}
                  className="h-4 w-4 accent-brand-teal"
                />
                <Icon className="h-4 w-4" aria-hidden="true" />
                {meta.label}
              </label>
            );
          })}
        </div>
        {fe?.methods && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.methods}</p>
        )}
      </fieldset>

      {/* 公開状態 */}
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-base border border-input p-4">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={profile.isPublished}
          className="h-5 w-5 accent-brand-teal"
        />
        <span>
          <span className="block text-sm font-medium text-primary">
            プロフィールを公開する
          </span>
          <span className="block text-xs text-gray-500">
            チェックすると検索結果・カタログに掲載されます。
          </span>
        </span>
      </label>

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
