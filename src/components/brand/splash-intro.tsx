"use client";

import * as React from "react";

import { LogoMark } from "./logo-mark";

/**
 * SplashIntro — フルスクリーン・オープニング演出（「ロゴがばっと開く」）。
 *
 * ブランド体験として brighty 由来の「グロー付き大ロゴの動的表示」を踏襲する。
 * 中央のロゴマークが scale 0.7→1 + opacity + 放射グロー拡大 + きらめき散開で
 * 「ばっと開き」、短いタグラインが現れ、最後にオーバーレイが上方向へワイプして
 * ページを表出する。
 *
 * SEO / LCP / CLS を悪化させないための厳格な挙動:
 *  ① client-only: マウント後（useEffect で didMount=true）にしか描画しない。
 *     SSR 出力には一切含まれないため、下層ページ（SSR 済）と SEO は不変。
 *  ② once / session: sessionStorage キー `uranai_splash_seen` で 1 セッション 1 回。
 *     ページ遷移（SPA ナビ／再訪）では再生しない。
 *  ③ skippable: click / Esc / scroll で即 dismiss。~3.0s で自動 dismiss（延伸版）。
 *  ④ prefers-reduced-motion: reduce のときは「表示しない」（即ページ）。
 *  ⑤ dismiss 後は DOM から除去（unmount）。fixed・transform/opacity のみで
 *     レイアウトを占有しないため CLS は発生しない。
 *
 * タイミング（v1.4.0 延伸 / 本家「占＋雲」マーク）— 余白を持ってゆっくり:
 *   位相1: ロゴ burst（ゆっくり開く, ~0.95s）＋ glow 拡大
 *   位相2: ホールド/呼吸の間（glow がゆっくり脈動, ~0.6s の静けさ）
 *   位相3: タグライン出現（~0.9s, 緩やかに）
 *   位相4: ゆったりワイプ（~0.8s）で表出
 *   総尺 ≈ AUTO_DISMISS_MS(3000) + WIPE_MS(800) ≈ 3.8s（体感 ~3.0–3.6s の余韻）
 */

const SESSION_KEY = "uranai_splash_seen";
const AUTO_DISMISS_MS = 3000;
const WIPE_MS = 800; // .animate-splash-wipe の長さ（globals.css）と一致（延伸）

type Phase = "idle" | "show" | "leaving" | "done";

/**
 * ロゴ周辺に散るきらめきの方向（--tx/--ty で外側へ飛ばす）。
 * 延伸版: delay を後ろ倒し（ロゴが開ききってから、ゆったり散る）。
 */
const SPARKS: ReadonlyArray<{ tx: string; ty: string; delay: string; size: number }> = [
  { tx: "-58px", ty: "-46px", delay: "520ms", size: 8 },
  { tx: "54px", ty: "-52px", delay: "640ms", size: 6 },
  { tx: "66px", ty: "30px", delay: "580ms", size: 7 },
  { tx: "-62px", ty: "34px", delay: "700ms", size: 5 },
  { tx: "0px", ty: "-72px", delay: "760ms", size: 6 },
  { tx: "10px", ty: "70px", delay: "680ms", size: 5 },
];

export function SplashIntro() {
  const [phase, setPhase] = React.useState<Phase>("idle");
  const wipeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Begin the wipe-out, then unmount after the wipe finishes.
  const dismiss = React.useCallback(() => {
    setPhase((prev) => {
      if (prev !== "show") return prev;
      // mark seen so SPA navigations / re-renders this session won't replay.
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* storage may be unavailable (private mode) — splash still dismisses */
      }
      if (wipeTimer.current) clearTimeout(wipeTimer.current);
      wipeTimer.current = setTimeout(() => setPhase("done"), WIPE_MS);
      return "leaving";
    });
  }, []);

  React.useEffect(() => {
    // ① client-only & ② once/session & ④ reduced-motion gating.
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      seen = false;
    }
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    if (seen || prefersReduced) {
      // Persist the "seen" flag even on reduced-motion so a later motion-allowing
      // tab in the same session is consistent (no surprise replay).
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      setPhase("done");
      return;
    }

    setPhase("show");
    autoTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);

    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
      if (wipeTimer.current) clearTimeout(wipeTimer.current);
    };
  }, [dismiss]);

  // ③ skippable — Esc / scroll while the overlay is showing.
  React.useEffect(() => {
    if (phase !== "show") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    const onScroll = () => dismiss();
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, [phase, dismiss]);

  // ⑤ Not mounted in SSR; removed from DOM once done (no CLS — it is fixed/full).
  if (phase === "idle" || phase === "done") return null;

  const leaving = phase === "leaving";

  return (
    <div
      // role=status + aria-label exposes the intro to AT; click anywhere skips.
      role="status"
      aria-label="占いクラウドへようこそ"
      data-splash={phase}
      onClick={dismiss}
      className={[
        "fixed inset-0 z-toast flex flex-col items-center justify-center",
        // ローズ系のグラデ背景（本家ヒーローの世界観に合わせる）。root は fade-in
        // のみ（全画面オーバーレイは scale させない）。glow/breathe は下のマーク背後
        // の <span> に限定する。
        "bg-gradient-to-b from-white to-brand-rose-pale",
        leaving ? "animate-splash-wipe" : "animate-fade-in",
      ].join(" ")}
      style={{ cursor: "pointer" }}
    >
      {/* Radiating teal glow behind the logo — 拡大 → 呼吸（位相2）。マーク背後に限定。 */}
      <span
        aria-hidden="true"
        className="animate-splash-glow pointer-events-none absolute h-64 w-64 rounded-full bg-brand-teal/25 blur-2xl"
      />

      {/* Logo + scattering sparks. */}
      <div className="relative">
        <span className="animate-splash-logo block">
          <LogoMark size={104} glow title="占いクラウド" />
        </span>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="animate-splash-spark pointer-events-none absolute left-1/2 top-1/2 block rounded-full bg-brand-teal"
            style={
              {
                width: s.size,
                height: s.size,
                marginLeft: -(s.size / 2),
                marginTop: -(s.size / 2),
                animationDelay: s.delay,
                ["--tx" as string]: s.tx,
                ["--ty" as string]: s.ty,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Tagline (reveals slightly after the logo). */}
      <p className="animate-splash-tagline mt-8 font-heading text-h4 font-semibold text-primary">
        あなたに合う占い師を。
      </p>
    </div>
  );
}
