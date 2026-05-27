"use client";

import * as React from "react";

/**
 * CountUp — in-view 数値カウントアップ（StatBand 用）。
 *
 * 要素が初めてビューポートに入ったとき、0 → `value`（実DB値）へ短時間で
 * カウントアップする。compositor 以外の負荷を避けるため requestAnimationFrame で
 * テキストのみ更新（レイアウトは固定幅 `tabular-nums` で桁ブレなし）。
 *
 * 表記対応:
 *  - 整数 (decimals=0): formatInt 相当（toLocaleString ja-JP）。例 16 / 32。
 *  - 小数 (decimals=1): formatRating 相当（toFixed(1)）。例 4.5。
 *  - star=true で先頭に「★」を付与（平均満足度の星表記）。
 *
 * a11y / robustness:
 *  - SSR / no-JS では最終値を直接描画（初期 state = value）。空白にならない。
 *  - prefers-reduced-motion: reduce のときはアニメーションせず即値。
 *  - IntersectionObserver 未対応/不発でも最終値のまま（hidden にしない）。
 */
type CountUpProps = {
  value: number;
  decimals?: 0 | 1;
  /** 平均満足度などで先頭に ★ を付ける。 */
  star?: boolean;
  durationMs?: number;
  className?: string;
};

function formatNumber(n: number, decimals: 0 | 1): string {
  if (decimals === 1) return n.toFixed(1);
  return Math.round(n).toLocaleString("ja-JP");
}

export function CountUp({
  value,
  decimals = 0,
  star = false,
  durationMs = 900,
  className,
}: CountUpProps) {
  // Initial state = final value -> SSR/no-JS always shows the real number.
  const [display, setDisplay] = React.useState(value);
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // reduced-motion: leave the final value in place (no animation).
    if (reduced) return;

    const run = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now();
      setDisplay(0);
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        // ease-out (decelerate) to match the snap easing feel.
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(value * eased);
        if (t < 1) requestAnimationFrame(tick);
        else setDisplay(value); // exact final value
      };
      requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            run();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, durationMs]);

  return (
    <span ref={ref} className={className}>
      {star && "★"}
      {formatNumber(display, decimals)}
    </span>
  );
}
