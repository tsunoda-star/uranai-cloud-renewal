"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CategoryOption {
  slug: string;
  label: string;
}

const ALL_VALUE = "__all__";

/**
 * Hero search form (Client Component).
 * Builds `/advisors?category=<slug>&q=<keyword>` and navigates on submit.
 * - role="search" landmark, labelled controls (header-nav / hero spec A11Y)
 * - keyword input has an accessible label; category Select defaults to "すべて"
 */
export function HeroSearch({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [category, setCategory] = React.useState<string>(ALL_VALUE);
  const [keyword, setKeyword] = React.useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category && category !== ALL_VALUE) {
      params.set("category", category);
    }
    const trimmed = keyword.trim();
    if (trimmed) params.set("q", trimmed);
    const query = params.toString();
    router.push(query ? `/advisors?${query}` : "/advisors");
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-card p-3 shadow-base sm:flex-row sm:items-center"
    >
      <div className="sm:w-52">
        <label htmlFor="hero-category" className="sr-only">
          占術カテゴリで絞り込む
        </label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="hero-category" className="h-12 border-gray-200">
            <SelectValue placeholder="占術カテゴリ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>すべての占術</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <label htmlFor="hero-keyword" className="sr-only">
          占い師・鑑定を検索
        </label>
        <Input
          id="hero-keyword"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="お悩み・占い師名・キーワード"
          className="h-12 border-gray-200 pl-10"
          aria-label="占い師・鑑定を検索"
        />
      </div>

      <Button type="submit" size="lg" className="h-12 font-semibold sm:px-8">
        <Search className="h-5 w-5" aria-hidden="true" />
        探す
      </Button>
    </form>
  );
}
