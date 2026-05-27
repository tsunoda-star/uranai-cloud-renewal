"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  Plus,
  Check,
  AlertCircle,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { METHOD_META } from "@/lib/divination";
import { CONSULTATION_METHODS } from "@/lib/queries";
import { formatJpy } from "@/lib/format";
import {
  saveAdvisorService,
  toggleServicePublished,
  deleteAdvisorService,
  type ServiceActionState,
} from "@/lib/actions/advisor-service";
import type { AdvisorOwnServiceView } from "@/lib/queries";

const initialState: ServiceActionState = { ok: false };

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "保存中…" : editing ? "変更を保存" : "サービスを登録"}
    </Button>
  );
}

/**
 * サービス管理（AC-B9-2）.
 * 上部に登録/編集フォーム、下部に一覧。公開トグル・削除は楽観更新 + サーバ確定。
 * 所有権・検証はすべて Server Action 側で強制（SEC-3）。
 */
export function AdvisorServiceManager({
  services: initialServices,
  categories,
}: {
  services: AdvisorOwnServiceView[];
  categories: CategoryOption[];
}) {
  const [editing, setEditing] = React.useState<AdvisorOwnServiceView | null>(
    null
  );
  const [formKey, setFormKey] = React.useState(0);

  function startCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
  }
  function startEdit(svc: AdvisorOwnServiceView) {
    setEditing(svc);
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section
        aria-labelledby="service-form-heading"
        className="rounded-2xl border border-gray-200 bg-card p-6 shadow-base"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="service-form-heading"
            className="font-heading text-h3 font-semibold text-primary"
          >
            {editing ? "サービスを編集" : "新しいサービスを登録"}
          </h2>
          {editing && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-base px-3 text-sm font-medium text-brand-teal-strong hover:bg-brand-rose-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              新規登録に切り替え
            </button>
          )}
        </div>
        <ServiceForm
          key={formKey}
          editing={editing}
          categories={categories}
          onSaved={startCreate}
        />
      </section>

      <section aria-labelledby="service-list-heading">
        <h2
          id="service-list-heading"
          className="font-heading text-h3 font-semibold text-primary"
        >
          登録済みサービス
        </h2>
        <div className="mt-5">
          <ServiceList
            initialServices={initialServices}
            onEdit={startEdit}
            editingId={editing?.id ?? null}
          />
        </div>
      </section>
    </div>
  );
}

function ServiceForm({
  editing,
  categories,
  onSaved,
}: {
  editing: AdvisorOwnServiceView | null;
  categories: CategoryOption[];
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(saveAdvisorService, initialState);
  const fe = state.fieldErrors;

  // 保存成功時、新規作成ならフォームをリセットする。
  React.useEffect(() => {
    if (state.ok && state.createdId) {
      onSaved();
    }
    // editing 更新時のみ動かす意図なので state を依存に持つ。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state.createdId]);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-5" noValidate>
      {editing && (
        <input type="hidden" name="serviceId" value={editing.id} />
      )}

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
          サービスを保存しました。
        </p>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-primary"
        >
          サービス名
        </label>
        <Input
          id="title"
          name="title"
          required
          maxLength={80}
          defaultValue={editing?.title ?? ""}
          className="mt-2 h-11"
        />
        {fe?.title && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.title}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-primary"
        >
          説明
        </label>
        <Textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={2000}
          defaultValue={editing?.description ?? ""}
          className="mt-2 min-h-24"
        />
        {fe?.description && (
          <p className="mt-1.5 text-xs text-state-danger">{fe.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="categoryId"
            className="block text-sm font-medium text-primary"
          >
            占術カテゴリ
          </label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={editing?.category.id ?? ""}
            className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              選択してください
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fe?.categoryId && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.categoryId}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="method"
            className="block text-sm font-medium text-primary"
          >
            相談形式
          </label>
          <select
            id="method"
            name="method"
            required
            defaultValue={editing?.method ?? ""}
            className="mt-2 flex h-11 w-full rounded-base border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>
              選択してください
            </option>
            {CONSULTATION_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_META[m].label}
              </option>
            ))}
          </select>
          {fe?.method && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.method}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="priceJpy"
            className="block text-sm font-medium text-primary"
          >
            価格（円）
          </label>
          <Input
            id="priceJpy"
            name="priceJpy"
            type="number"
            inputMode="numeric"
            min={0}
            max={1000000}
            required
            defaultValue={editing?.priceJpy ?? ""}
            className="mt-2 h-11 tabular-nums"
          />
          {fe?.priceJpy && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.priceJpy}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="durationMin"
            className="block text-sm font-medium text-primary"
          >
            所要時間（分）
          </label>
          <Input
            id="durationMin"
            name="durationMin"
            type="number"
            inputMode="numeric"
            min={5}
            max={480}
            required
            defaultValue={editing?.durationMin ?? ""}
            className="mt-2 h-11 tabular-nums"
          />
          {fe?.durationMin && (
            <p className="mt-1.5 text-xs text-state-danger">{fe.durationMin}</p>
          )}
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-base border border-input p-4">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={editing ? editing.isPublished : true}
          className="h-5 w-5 accent-brand-teal"
        />
        <span className="text-sm font-medium text-primary">
          このサービスを公開する（検索・一覧に掲載）
        </span>
      </label>

      <div>
        <SaveButton editing={!!editing} />
      </div>
    </form>
  );
}

function ServiceList({
  initialServices,
  onEdit,
  editingId,
}: {
  initialServices: AdvisorOwnServiceView[];
  onEdit: (svc: AdvisorOwnServiceView) => void;
  editingId: string | null;
}) {
  const [services, setServices] = React.useState(initialServices);
  // 親（page）の再検証で initialServices が更新されたら同期する。
  React.useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  function onToggle(svc: AdvisorOwnServiceView) {
    setError(null);
    setBusyId(svc.id);
    const next = !svc.isPublished;
    setServices((list) =>
      list.map((s) => (s.id === svc.id ? { ...s, isPublished: next } : s))
    );
    startTransition(async () => {
      const result = await toggleServicePublished(svc.id, next);
      if (!result.ok) {
        // rollback
        setServices((list) =>
          list.map((s) =>
            s.id === svc.id ? { ...s, isPublished: svc.isPublished } : s
          )
        );
        setError("公開状態の変更に失敗しました。");
      }
      setBusyId(null);
    });
  }

  function onDelete(svc: AdvisorOwnServiceView) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`「${svc.title}」を削除します。よろしいですか？`)
    ) {
      return;
    }
    setError(null);
    setBusyId(svc.id);
    const prev = services;
    setServices((list) => list.filter((s) => s.id !== svc.id));
    startTransition(async () => {
      const result = await deleteAdvisorService(svc.id);
      if (!result.ok) {
        setServices(prev);
        setError("削除に失敗しました。");
      }
      setBusyId(null);
    });
  }

  if (services.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-8 text-center text-sm text-gray-500">
        登録済みのサービスはありません。上のフォームから登録してください。
      </p>
    );
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-sm text-state-danger">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {services.map((svc) => {
          const meta = METHOD_META[svc.method];
          const MethodIcon = meta.icon;
          const busy = busyId === svc.id;
          return (
            <li
              key={svc.id}
              className={cn(
                "rounded-2xl border bg-card p-5 shadow-base transition-colors",
                editingId === svc.id
                  ? "border-brand-teal"
                  : "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-h4 font-semibold text-primary">
                    {svc.title}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MethodIcon
                        className="h-3.5 w-3.5 text-brand-teal-strong"
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                    <span>{svc.category.label}</span>
                    <span className="tabular-nums">
                      {formatJpy(svc.priceJpy)} 円
                    </span>
                    <span className="tabular-nums">{svc.durationMin} 分</span>
                  </p>
                </div>
                <Badge variant={svc.isPublished ? "success" : "secondary"}>
                  {svc.isPublished ? "公開中" : "非公開"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(svc)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  {svc.isPublished ? (
                    <>
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                      非公開にする
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      公開する
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(svc)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(svc)}
                  disabled={busy}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-base border border-input px-3 text-sm font-medium text-state-danger transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  削除
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
