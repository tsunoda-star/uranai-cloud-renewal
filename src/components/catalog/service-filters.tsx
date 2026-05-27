"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METHOD_META } from "@/lib/divination";
import type { ConsultationMethod } from "@prisma/client";
import type { CategoryOption } from "@/components/catalog/advisor-filters";

export interface ServiceFilterState {
  category: string;
  method: string;
  price: string;
  sort: string;
}

const ALL = "__all__";

/** Price-band options (mirrors the advisor catalog bands). */
const PRICE_BANDS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "-2000", label: "〜2,000円" },
  { value: "2000-3500", label: "2,000〜3,500円" },
  { value: "3500-5000", label: "3,500〜5,000円" },
  { value: "5000-", label: "5,000円〜" },
];

const SORTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "recommended", label: "おすすめ順" },
  { value: "newest", label: "新着順" },
  { value: "price_asc", label: "価格が安い順" },
  { value: "price_desc", label: "価格が高い順" },
];

const METHOD_OPTIONS = (
  ["PHONE", "CHAT", "EMAIL", "ZOOM", "IN_PERSON"] as ConsultationMethod[]
).map((m) => ({ value: m, label: METHOD_META[m].label }));

/**
 * Service catalog filter bar (Client). The whole search state lives in the URL
 * searchParams (spec §2) so links are shareable and reloads reproduce the view.
 * Changing any control pushes a new URL (resetting page), which re-runs the
 * Server Component query (searchServices).
 */
export function ServiceFilters({
  categories,
  initial,
  basePath,
}: {
  categories: CategoryOption[];
  initial: ServiceFilterState;
  basePath: string;
}) {
  const router = useRouter();

  const pushWith = React.useCallback(
    (patch: Partial<ServiceFilterState>) => {
      const next: ServiceFilterState = { ...initial, ...patch };
      const params = new URLSearchParams();
      if (next.category && next.category !== ALL) {
        params.set("category", next.category);
      }
      if (next.method && next.method !== ALL) params.set("method", next.method);
      if (next.price && next.price !== ALL) params.set("price", next.price);
      if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [initial, basePath, router]
  );

  const hasFilters =
    (initial.category !== ALL && initial.category !== "") ||
    (initial.method !== ALL && initial.method !== "") ||
    (initial.price !== ALL && initial.price !== "") ||
    (initial.sort !== "recommended" && initial.sort !== "");

  return (
    <div className="rounded-2xl border border-gray-200 bg-card p-4 shadow-base sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Facet
            label="占術カテゴリ"
            value={initial.category || ALL}
            placeholder="占術"
            options={[
              { value: ALL, label: "すべての占術" },
              ...categories.map((c) => ({ value: c.slug, label: c.label })),
            ]}
            onChange={(v) => pushWith({ category: v })}
          />

          <Facet
            label="相談形式"
            value={initial.method || ALL}
            placeholder="形式"
            options={[{ value: ALL, label: "すべての形式" }, ...METHOD_OPTIONS]}
            onChange={(v) => pushWith({ method: v })}
          />

          <Facet
            label="価格帯"
            value={initial.price || ALL}
            placeholder="価格帯"
            options={[{ value: ALL, label: "すべての価格" }, ...PRICE_BANDS]}
            onChange={(v) => pushWith({ price: v })}
          />

          <Facet
            label="並び替え"
            value={initial.sort || "recommended"}
            placeholder="並び替え"
            options={SORTS}
            onChange={(v) => pushWith({ sort: v })}
          />
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(basePath)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              条件をクリア
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Facet({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = `service-facet-${label}`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="h-11 border-gray-200">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
