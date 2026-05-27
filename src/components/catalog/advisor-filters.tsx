"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { METHOD_META } from "@/lib/divination";
import type { ConsultationMethod } from "@prisma/client";

export interface CategoryOption {
  slug: string;
  label: string;
}

export interface AdvisorFilterState {
  category: string;
  method: string;
  price: string;
  rating: string;
  sort: string;
  q: string;
}

const ALL = "__all__";

/** Price-band options (value encodes "min-max"; open-ended uses empty side). */
const PRICE_BANDS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "-2000", label: "〜2,000円" },
  { value: "2000-3500", label: "2,000〜3,500円" },
  { value: "3500-5000", label: "3,500〜5,000円" },
  { value: "5000-", label: "5,000円〜" },
];

const RATING_BANDS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "4.5", label: "★4.5以上" },
  { value: "4", label: "★4.0以上" },
  { value: "3", label: "★3.0以上" },
];

const SORTS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "recommended", label: "おすすめ順" },
  { value: "newest", label: "新着順" },
  { value: "rating", label: "評価が高い順" },
];

const METHOD_OPTIONS = (
  ["PHONE", "CHAT", "EMAIL", "ZOOM", "IN_PERSON"] as ConsultationMethod[]
).map((m) => ({ value: m, label: METHOD_META[m].label }));

/**
 * Advisor catalog filter bar (Client). The whole search state lives in the URL
 * searchParams (spec §2: SSR searchParams) so links are shareable and reloads
 * reproduce the view. Changing any control pushes a new URL (resetting page),
 * which re-runs the Server Component query.
 */
export function AdvisorFilters({
  categories,
  initial,
  basePath,
  lockCategory = false,
}: {
  categories: CategoryOption[];
  initial: AdvisorFilterState;
  /** Route to push to (e.g. "/advisors"). */
  basePath: string;
  /** When true the category facet is fixed (category landing pages). */
  lockCategory?: boolean;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = React.useState(initial.q);

  React.useEffect(() => {
    setKeyword(initial.q);
  }, [initial.q]);

  const pushWith = React.useCallback(
    (patch: Partial<AdvisorFilterState>) => {
      const next: AdvisorFilterState = { ...initial, ...patch };
      const params = new URLSearchParams();
      if (!lockCategory && next.category && next.category !== ALL) {
        params.set("category", next.category);
      }
      if (next.method && next.method !== ALL) params.set("method", next.method);
      if (next.price && next.price !== ALL) params.set("price", next.price);
      if (next.rating && next.rating !== ALL) params.set("rating", next.rating);
      if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
      const q = next.q.trim();
      if (q) params.set("q", q);
      const qs = params.toString();
      router.push(qs ? `${basePath}?${qs}` : basePath);
    },
    [initial, basePath, router, lockCategory]
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    pushWith({ q: keyword });
  }

  const hasFilters =
    (!lockCategory && initial.category !== ALL && initial.category !== "") ||
    (initial.method !== ALL && initial.method !== "") ||
    (initial.price !== ALL && initial.price !== "") ||
    (initial.rating !== ALL && initial.rating !== "") ||
    initial.q.trim() !== "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-card p-4 shadow-base sm:p-5">
      <form role="search" onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <label htmlFor="advisor-q" className="sr-only">
            占い師名・自己紹介・サービス名で検索
          </label>
          <Input
            id="advisor-q"
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="占い師名・キーワードで検索"
            className="h-12 border-gray-200 pl-10"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {!lockCategory && (
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
          )}

          <Facet
            label="相談形式"
            value={initial.method || ALL}
            placeholder="形式"
            options={[
              { value: ALL, label: "すべての形式" },
              ...METHOD_OPTIONS,
            ]}
            onChange={(v) => pushWith({ method: v })}
          />

          <Facet
            label="価格帯"
            value={initial.price || ALL}
            placeholder="価格帯"
            options={[
              { value: ALL, label: "すべての価格" },
              ...PRICE_BANDS,
            ]}
            onChange={(v) => pushWith({ price: v })}
          />

          <Facet
            label="評価"
            value={initial.rating || ALL}
            placeholder="評価"
            options={[{ value: ALL, label: "すべての評価" }, ...RATING_BANDS]}
            onChange={(v) => pushWith({ rating: v })}
          />

          <Facet
            label="並び替え"
            value={initial.sort || "recommended"}
            placeholder="並び替え"
            options={SORTS}
            onChange={(v) => pushWith({ sort: v })}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button type="submit" size="sm" className="font-semibold">
            <Search className="h-4 w-4" aria-hidden="true" />
            この条件で検索
          </Button>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(basePath)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              条件をクリア
            </Button>
          )}
        </div>
      </form>
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
  const id = `facet-${label}`;
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
