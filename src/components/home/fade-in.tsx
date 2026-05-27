"use client";

import * as React from "react";

/**
 * FadeIn — entrance reveal (brighty load-cascade language, v1.2.0).
 *
 * CSS-animation based (no JS motion engine). Compositor-only props
 * (opacity + translateY) with `fill-mode: both`, so the FINAL state is always
 * applied even when JS never runs. This is what fixes the prior bug where lower
 * sections rendered blank (the old motion/react `whileInView` kept content at
 * opacity:0 until scrolled into view, and SSR/no-JS left it invisible).
 *
 * Variants:
 * - "onload" (default): plays immediately on mount, with a per-item stagger
 *   delay (`index` -> .stagger-N). Used for the hero cascade ("パッと出る").
 * - "scroll": the element is fully visible by default; an IntersectionObserver
 *   replays the entrance once when it enters the viewport. A missed/absent
 *   observer NEVER hides content (robust fallback).
 *
 * `prefers-reduced-motion: reduce` disables the animation entirely (handled in
 * globals.css), leaving content statically visible.
 */
type FadeInProps = {
  children: React.ReactNode;
  /** Stagger index (0-6) -> animation-delay step. Used by the onload cascade. */
  index?: number;
  variant?: "onload" | "scroll";
  className?: string;
  as?: "div" | "section" | "li";
};

const STAGGER_CLASS = [
  "stagger-0",
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
] as const;

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function FadeIn({
  children,
  index = 0,
  variant = "onload",
  className,
  as = "div",
}: FadeInProps) {
  const Tag = as;

  if (variant === "scroll") {
    return (
      <ScrollReveal as={as} index={index} className={className}>
        {children}
      </ScrollReveal>
    );
  }

  // onload: animate immediately, staggered by index.
  const stagger = STAGGER_CLASS[Math.min(index, STAGGER_CLASS.length - 1)];
  return (
    <Tag className={cx("animate-fade-up", stagger, className)}>{children}</Tag>
  );
}

/**
 * ScrollReveal — content is visible by default (SSR / no-JS safe). On mount, an
 * IntersectionObserver adds `is-revealing` the first time the element enters the
 * viewport to replay the fade-up. If the observer is unavailable or never fires,
 * the element simply stays visible — content is never trapped at opacity:0.
 */
function ScrollReveal({
  children,
  index,
  className,
  as,
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
  as: "div" | "section" | "li";
}) {
  const Tag = as;
  const ref = React.useRef<HTMLElement | null>(null);
  const [revealing, setRevealing] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    // Respect reduced-motion: don't even arm the observer.
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealing(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stagger = STAGGER_CLASS[Math.min(index, STAGGER_CLASS.length - 1)];

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cx(
        "reveal-on-scroll",
        revealing && "is-revealing",
        revealing && stagger,
        className
      )}
    >
      {children}
    </Tag>
  );
}
