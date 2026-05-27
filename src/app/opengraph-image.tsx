import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

/**
 * Open Graph / Twitter card image (1200×630) — 占いクラウド 本家ブランド版。
 *
 * ink #212529 背景に「占＋雲」合字マーク（白・本家アイコン忠実再現）＋ teal の
 * 装飾グロー＋ローズ/ゴールドの星アクセント。ロゴタイプ「占いクラウド」を併記。
 * Edge runtime / next/og（ImageResponse）で動的生成（静的バンドルではない）。
 */
export const runtime = "edge";
export const alt = "占いクラウド — 温かく信頼できる相談相手を見つける";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#212529",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* teal radial glow (decorative) */}
        <div
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(52,204,204,0.22)",
            filter: "blur(80px)",
            top: 55,
          }}
        />
        {/* rose accent glow */}
        <div
          style={{
            position: "absolute",
            width: 360,
            height: 360,
            borderRadius: 9999,
            background: "rgba(243,79,95,0.16)",
            filter: "blur(90px)",
            right: 120,
            bottom: 60,
          }}
        />

        {/* 占＋雲 合字マーク（白ストロークで本家アイコンを再現） */}
        <svg
          width="220"
          height="220"
          viewBox="0 0 32 32"
          fill="none"
          style={{ position: "relative" }}
        >
          <g
            stroke="#34cccc"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 4 V12.4" />
            <path d="M15 7 H24.6" />
            <path d="M15 12.4 a3.2 3.2 0 0 0 -4.9 0.5 a3.5 3.5 0 0 0 -0.7 6.9 H22.7 a3.2 3.2 0 0 0 0.5 -6.35 a4.6 4.6 0 0 0 -8.0 -1.2 Z" />
          </g>
        </svg>

        <div
          style={{
            marginTop: 28,
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            position: "relative",
          }}
        >
          占いクラウド
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 30,
            color: "#d1d5db",
            letterSpacing: "0.08em",
            position: "relative",
          }}
        >
          Uranai Cloud
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 30,
            color: "#e6f7f7",
            position: "relative",
          }}
        >
          {siteConfig.description}
        </div>
      </div>
    ),
    { ...size }
  );
}
