import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight Avatar (no external dependency).
 *
 * Renders a photo when `src` is provided, otherwise an initials fallback on a
 * teal-pale disc (brand-rose-pale bg + teal-strong text, AA on pale ≥5:1).
 * The whole control is `aria-hidden` when used purely decoratively next to a
 * text label; pass `alt` to expose an accessible image name.
 */

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-20 w-20 text-h4",
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  alt?: string;
  name: string;
  size?: keyof typeof SIZES;
}

/** Derive up to 2 initials from a display name (handles JP names by first char). */
function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[1][0] ?? "");
  }
  return trimmed.slice(0, 2);
}

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-brand-rose-pale font-heading font-semibold text-brand-teal-strong",
        SIZES[size],
        className
      )}
      {...props}
    >
      {src ? (
        // Advisor avatars are the real uranai.cloud photos (public/avatars/real-*.png,
        // local for demo; W4 migration may point photoUrl at asset.matchingcloud.com
        // — allowed via next.config remotePatterns). A plain <img> is intentional
        // (same-origin local now; remote host is policy-listed for migration).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? `${name}のプロフィール写真`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
