import * as React from "react";

import { LogoMark } from "./logo-mark";

/**
 * CelestialMotif — ヒーロー右側のブランドビジュアル（本家 uranai.cloud の世界観）。
 *
 * ローズグラデ帯の上に「12 星座を結ぶ星座線（コンステレーション）＋星々」を SVG で
 * 描き、中央に本家「占＋雲」マーク（teal グロー）を浮かべる。装飾のみ（aria-hidden）。
 *
 * デザイン方針:
 *   - 過剰にしない。brighty の余白感を維持（星はまばら、線は細く控えめ）。
 *   - 配色は uranai 実配色: rose 帯 / teal マーク・線 / gold の星。
 *   - モーションは compositor props のみ（transform/opacity）。hero-float（マーク）/
 *     hero-twinkle（星）/ pulse-dot（背後グロー）を流用し、reduced-motion で全停止
 *     （globals.css の @media prefers-reduced-motion で animation:none）。
 *
 * 12 個の星（黄道十二宮の象徴）を円環状に配し、隣接星を細い teal 線で結ぶ。
 */

// 円環状に等間隔配置した 12 の星（角度→座標, 半径 r、中心 cx/cy）。
const CX = 160;
const CY = 160;
const R = 118;
const ZODIAC_STARS = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 12 - Math.PI / 2; // 上(−90°)始まり
  return {
    x: +(CX + R * Math.cos(angle)).toFixed(1),
    y: +(CY + R * Math.sin(angle)).toFixed(1),
    // 大きさ・瞬きの遅延を散らす（規則的すぎない見え方に）。
    rad: 2.0 + (i % 3) * 0.7,
    delay: (i * 230) % 2600,
  };
});

// 星座線（円環を結ぶ多角形のパス）。
const RING_PATH =
  ZODIAC_STARS.map((s, i) => `${i === 0 ? "M" : "L"}${s.x} ${s.y}`).join(" ") +
  " Z";

export function CelestialMotif() {
  return (
    <div
      className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-brand-rose-pale via-white to-brand-teal-pale shadow-base"
      aria-hidden="true"
    >
      {/* 星座線＋星々（黄道十二宮モチーフ）。SVG は全面に敷く。 */}
      <svg
        viewBox="0 0 320 320"
        className="absolute inset-0 h-full w-full"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* 星座線（控えめな teal、細線・低不透明度） */}
        <path
          d={RING_PATH}
          stroke="#0d7373"
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* 12 の星（gold/teal を交互に。twinkle でゆっくり瞬く） */}
        {ZODIAC_STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.rad}
            className="animate-hero-twinkle"
            fill={i % 2 === 0 ? "#efbf2f" : "#34cccc"}
            style={{ animationDelay: `${s.delay}ms` }}
          />
        ))}
        {/* 散りばめた小さな星（まばら・余白を保つ） */}
        {[
          { x: 70, y: 80, r: 1.4, d: 400 },
          { x: 250, y: 96, r: 1.6, d: 1200 },
          { x: 240, y: 236, r: 1.4, d: 800 },
          { x: 82, y: 240, r: 1.5, d: 1700 },
        ].map((s, i) => (
          <circle
            key={`m-${i}`}
            cx={s.x}
            cy={s.y}
            r={s.r}
            className="animate-hero-twinkle"
            fill="#0d7373"
            fillOpacity="0.5"
            style={{ animationDelay: `${s.d}ms` }}
          />
        ))}
      </svg>

      {/* 背後の teal グロー（マーク周辺に限定） */}
      <span className="animate-pulse-dot absolute h-48 w-48 rounded-full bg-brand-teal/20 blur-2xl" />

      {/* 中央の本家「占＋雲」マーク（teal グロー・ゆるやかに浮遊） */}
      <span className="animate-hero-float relative text-brand-ink">
        <LogoMark size={156} glow />
      </span>
    </div>
  );
}
