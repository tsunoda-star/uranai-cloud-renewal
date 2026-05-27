import * as React from "react";

/**
 * LogoMark — 占いクラウド（uranai.cloud）の本家ブランドマークを忠実に SVG 再現。
 *
 * 本家アイコン（asset.matchingcloud.com/site/8429b101-…png, 512²）の合字モチーフ:
 *   - 「占」漢字の 卜（ぼく）= 縦棒 ＋ 右上へ伸びる横の旗（フラッグ）ストローク
 *   - 「占」の 口 を **雲（クラウド）** の輪郭に置き換えた合字（占 × クラウド）
 * 本家は単一ウェイトの線画（塗りなし・ストローク）。ここでもストロークで再現し、
 * `stroke="currentColor"` で recolor 可能（ヘッダー=ink、スプラッシュ/ヒーロー=teal 等）。
 *
 * カラー方針（design-system.yml v1.4.0 / uranai 実配色）:
 *   - 既定は currentColor を継承（親の text-* で着色）。ink #212529 / teal #34cccc 等。
 *   - `glow` を true にすると teal の演出グロー（SVG <filter>）を付与する。
 *     グローはブランド演出としてロゴ周辺に限定（ヒーロー/スプラッシュのロゴ表示のみ）。
 *
 * 装飾要素のため既定で `aria-hidden`。意味を持たせたい場合は `title` を渡す
 * （その場合 role="img" + <title> を出力）。構造/API は従来と互換（size/glow/title）。
 */
export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  /** px サイズ（width=height）。既定 24。 */
  size?: number;
  /** teal の演出グロー（ロゴ周辺限定のブランド演出）を付与する。 */
  glow?: boolean;
  /** アクセシブルな名前。指定時は role="img"+<title>、未指定時は aria-hidden。 */
  title?: string;
}

export function LogoMark({
  size = 24,
  glow = false,
  title,
  className,
  ...props
}: LogoMarkProps) {
  // filter id をインスタンスごとに一意化（同一ページ複数配置でも衝突しない）。
  const reactId = React.useId();
  const glowId = `lm-glow-${reactId}`;
  const labelId = title ? `lm-label-${reactId}` : undefined;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={labelId}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title id={labelId}>{title}</title>}
      {glow && (
        <defs>
          <filter
            id={glowId}
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feFlood floodColor="#34cccc" floodOpacity="0.5" result="teal" />
            <feComposite in="teal" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      {/* 本家「占＋雲」の合字を単一ウェイト線画で再現。currentColor で着色。 */}
      <g
        filter={glow ? `url(#${glowId})` : undefined}
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 卜の縦棒（上から雲の入口へ降りる） */}
        <path d="M15 4 V12.4" />
        {/* 卜の右上フラッグ（縦棒の上部から右へ伸びる横ストローク） */}
        <path d="M15 7 H24.6" />
        {/*
          雲（占の口の置換）。左から右へ、左の小ロブ → 縦棒が入る中央のくぼみ →
          大きい右ドーム、を持つ雲の輪郭を、下辺フラットの 1 ストロークで閉じる。
          縦棒は雲上辺の中央のくぼみに接続する（占＝卜＋口 の合字）。
        */}
        <path d="M15 12.4
                 a3.2 3.2 0 0 0 -4.9 0.5
                 a3.5 3.5 0 0 0 -0.7 6.9
                 H22.7
                 a3.2 3.2 0 0 0 0.5 -6.35
                 a4.6 4.6 0 0 0 -8.0 -1.2
                 Z" />
      </g>
    </svg>
  );
}
