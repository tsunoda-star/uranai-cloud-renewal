"use client";

import * as React from "react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/lib/actions/favorite";

/**
 * Favorite toggle (AC-B4). Rendered only when the server has already confirmed
 * an authenticated GENERAL session, so this control assumes it is allowed to
 * call the action; the action re-checks auth/RBAC server-side regardless
 * (SEC-2, defense in depth). Optimistic UI with rollback on failure.
 */
export function FavoriteButton({
  advisorSlug,
  initialFavorited,
}: {
  advisorSlug: string;
  initialFavorited: boolean;
}) {
  const [favorited, setFavorited] = React.useState(initialFavorited);
  const [pending, startTransition] = React.useTransition();

  function onClick() {
    const optimistic = !favorited;
    setFavorited(optimistic);
    startTransition(async () => {
      const result = await toggleFavorite(advisorSlug);
      if (!result.ok) {
        // rollback
        setFavorited(!optimistic);
      } else {
        setFavorited(result.favorited);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-base border px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60",
        favorited
          ? "border-brand-teal bg-brand-rose-pale text-brand-teal-strong"
          : "border-input bg-background text-primary hover:bg-secondary"
      )}
    >
      <Heart
        className={cn("h-4 w-4", favorited && "fill-brand-teal-strong")}
        aria-hidden="true"
      />
      {favorited ? "お気に入り済み" : "お気に入りに追加"}
    </button>
  );
}
