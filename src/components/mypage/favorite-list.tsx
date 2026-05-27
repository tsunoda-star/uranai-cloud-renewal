"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, HeartOff } from "lucide-react";

import { FortuneTellerCard } from "@/components/home/fortune-teller-card";
import { removeFavorite } from "@/lib/actions/favorite";
import type { AdvisorCardView } from "@/lib/queries";

/**
 * お気に入り占い師一覧（解除可, AC-B8）.
 * 各カードは既存 FortuneTellerCard を再利用し、その下に「お気に入り解除」操作を
 * 付与する。解除は楽観的にリストから除去し、失敗時に復元する。RBAC/所有権は
 * removeFavorite がサーバ側で再検証する。
 */
export function FavoriteList({
  initialFavorites,
}: {
  initialFavorites: AdvisorCardView[];
}) {
  const [favorites, setFavorites] = React.useState(initialFavorites);

  if (favorites.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 bg-card p-6 text-sm text-gray-500">
        <Heart className="mr-1.5 inline h-4 w-4 text-gray-400" aria-hidden="true" />
        お気に入りに登録した占い師はまだいません。
        <Link
          href="/advisors"
          className="ml-1 font-medium text-brand-teal-strong hover:underline"
        >
          占い師を探す
        </Link>
      </p>
    );
  }

  function onRemove(slug: string) {
    const prev = favorites;
    setFavorites((list) => list.filter((a) => a.slug !== slug));
    void removeFavorite(slug).then((result) => {
      if (!result.ok) setFavorites(prev); // rollback
    });
  }

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {favorites.map((advisor) => (
        <li key={advisor.slug} className="flex flex-col gap-2">
          <FortuneTellerCard advisor={advisor} />
          <button
            type="button"
            onClick={() => onRemove(advisor.slug)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 self-start rounded-base border border-input px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <HeartOff className="h-4 w-4" aria-hidden="true" />
            お気に入りを解除
          </button>
        </li>
      ))}
    </ul>
  );
}
