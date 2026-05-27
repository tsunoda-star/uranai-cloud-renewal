# UI Guidelines — 占いクラウド リニューアル

> **v1.4.0 更新 (本家ブランド忠実化)**: 配色は本家 uranai.cloud 実配色へ全面 remap
> （旧 brighty 暖色 coral/navy → **teal `#34cccc` 主 / rose ヒーロー帯 / gold `#efbf2f` ★ /
> blue `#0c75b0` リンク / ink `#212529` 本文・主CTA=黒**）。テキスト/小UIは AA 濃色派生
> （teal-strong `#0d7373` / gold-text `#8f6c00` / red-text `#cc2233`）を使用し、明色は塗り/装飾のみ。
> ロゴは本家「占＋雲」合字、アバターは本家実写、ヒーロー/ブログは天体モチーフ。
> 正本トークンは `design-system.yml` (v1.4.0) を参照。レイアウト/モーション品質は brighty 水準を踏襲。

| 項目 | 内容 |
|------|------|
| プロジェクト | 占いクラウド（www.uranai.cloud）全面リニューアル |
| Phase | Phase 2: 設計 |
| 入力 | `docs/design/design-system.yml` (v1.1.0), `docs/requirements/design-requirements.md` (v1.1.0) |
| 参照サイト | `brighty.site`（実測トークン準拠） |
| バージョン | 1.0.0 |

---

## 1. Aesthetic Direction

**Tone**: warm-refined（温かみ・上質）
**Mood**: clean-trustworthy（清潔・信頼）

### Differentiation

白〜オフホワイト基調のミニマルUIに、`navy #222233`（信頼・専門性）をベース、`coral orange #e2734d`（温かみ・親しみ）を主アクセント／CTAとして配する。占いサイトにありがちな黒背景・紫グラデ・派手な装飾を排し、brighty 水準の洗練さで「温かく信頼できる相談相手を見つける場所」という印象を与える。**一つ覚えてもらうなら「温かいコーラルのCTAと、navy の落ち着いた専門性のコントラスト」**。

---

## 2. Color Guidelines

### 2.1 役割分担（Semantic Roles）

| 役割 | トークン | Hex | 用途 |
|------|---------|-----|------|
| 主アクション（塗り） | `brand-orange` | `#e2734d` | プライマリ CTA ボタン塗り。ラベルは白・**太字・large** 運用（UI 3:1 / large 3:1 を満たす） |
| 主アクション（テキスト/小） | `brand-orange-strong` | `#c2410c` | リンク文字色、小サイズボタンの白文字背景、アイコン（AA 4.5:1） |
| 信頼・見出し | `brand-navy` | `#222233` | H1〜H3、フッター、ダーク面、本文濃色 |
| 淡い暖色背景 | `brand-orange-pale` | `#fbf3ef` | セクション区切り、タグ背景、ハイライト帯 |
| セカンダリ/成功（塗り） | `brand-green` | `#5ba97b` | 成功バッジ・アクセプト状態の塗り |
| 成功テキスト | `success-fg` | `#27704d` | 「予約承認」等の状態テキスト・アイコン |
| アクセント（塗り） | `brand-yellow` | `#d4a054` | 星モチーフ、評価、注目バッジ（文字は navy/black） |
| 警告テキスト | `warning-fg` | `#946018` | 注意状態テキスト |
| 危険 | `danger` | `#c0392b` | 辞退・エラーのテキスト/枠 |

### 2.2 Color Principles

- **支配色は navy（テキスト・構造）、差し色は coral orange（行動喚起）**。1画面で coral の塗り CTA は1〜2個に絞り、視線を主CTAへ集中させる。
- **塗りとテキストで色トークンを使い分ける**: coral/green/yellow は「塗り」で映え、「小サイズ文字」では AA を満たさない。テキストには必ず `-strong` / `-fg` 派生色を使う（§3.3 of design-requirements）。
- **brand-yellow の上に白文字を置かない**（2.34:1）。navy または black を使う。
- 状態は色のみに依存しない。成功=チェックアイコン+`success-fg`テキスト、危険=警告アイコン+`danger`テキスト（A11Y-10）。

### 2.3 Dark Mode

- ベース面 `#222233`、サーフェス `#2a2a3d`。本文 `#ffffff`（15.62:1）、補助 `#d1d5db`（10.60:1）。
- ダーク面の CTA テキストは `#ee9272`（6.69:1）。塗り CTA は `#e2734d`（navy 上 5.05:1）。
- ダーク＝黒一辺倒にせず navy ベースで「上質な夜」を表現する。

---

## 3. Typography Guidelines

### 3.1 Principles（brighty 実測準拠）

- Latin 見出し: **Outfit**（600/700/800）/ Latin 本文: **DM Sans**（400/500/600）/ 日本語: **Noto Sans JP**（300–800）。
- 混植は CSS `font-family` で Latin → JP の順に指定（`"Outfit", "Noto Sans JP", system-ui`）。
- **禁止**: Inter / Roboto / Arial。fallback も `system-ui` を用い Arial を明示しない。

### 3.2 Application

| 要素 | フォント | スケール |
|------|---------|---------|
| Hero Title | Outfit 800 + Noto Sans JP 800 | display 3rem / lh1.1 |
| ページ見出し H1 | Outfit 700 / Noto Sans JP 700 | h1 2.25rem |
| セクション見出し H2 | Outfit 700 / Noto Sans JP 700 | h2 1.75rem |
| カード見出し H3 | Outfit 600 / Noto Sans JP 600 | h3 1.375rem |
| 本文 | DM Sans 400 / Noto Sans JP 400 | body 1rem / lh1.7 |
| ブログ本文 | Noto Sans JP 400 | body-lg 1.125rem / lh1.7、max-width 42rem |
| 統計数値 | Outfit 700, `tabular-nums` | display〜h1 |
| タグ・メタ | DM Sans 500 / Noto Sans JP 500 | xs 0.75rem |

### 3.3 Rules

- 見出しに `text-balance` を適用。字間を見出しで微調整。
- 統計・価格は `tabular-nums`。
- 本文行長 65–75 字（ブログ本文 max-width ≈ 42rem）。

---

## 4. Spacing & Layout Guidelines

- 8px グリッド。スペーシングスケール 4/8/16/24/32/48/64/96px。
- セクション間: モバイル 48px / デスクトップ 96px。
- コンテナ最大幅 80rem（1280px）、ワイド 96rem（1536px）、本文 42rem。
- カード内 padding は一定（md=16px / lg=24px）。要素を詰め込まない（LAY-1 余白を恐れない）。
- z-index は段階管理: base0 / dropdown1000 / sticky1100 / overlay1200 / modal1300 / toast1400。
- **レイアウトにリズムを持たせる**（LAY-8）: フル幅ヒーロー → 統計バンド（暖色 pale 背景）→ カテゴリグリッド → 3ステップ → ピックアップ占い師 と密度を変える。単調な「ヒーロー＋3カラム反復」を避ける。

---

## 5. Motion Guidelines（v1.2.0 — brighty 動的デザイン強化）

二層の duration ルール（design-system.yml v1.2.0 `animation_rules`）:

- **入場演出 ≤ 700ms**（ロード時カスケード / スクロールリビール / ロゴ pop-in）。
- **マイクロ操作 ≤ 200ms**（hover / press / 色変化）。
- コンポジタプロパティ（`transform` / `opacity`）のみ。`width/height/top/left` のアニメーション禁止（CLS/LCP 不変）。
- easing は `ease-snap = cubic-bezier(.22,1,.36,1)`（brighty スナップ減速）。
- `prefers-reduced-motion: reduce` で**全演出を即時最終状態**に（A11Y-9）。ティッカー静止・pulse 停止・カスケード無効。

実装パターン:

- **ロード時カスケード**（ヒーロー）: 子要素を `fade-up`（opacity0+translateY12px→1+0）0.5s ease-snap `both`、
  stagger 0/60/120/150/180/240ms。`fill: both` のため JS 無しでも最終状態が出る（旧 whileInView の「下部が真っ白」バグを解消）。
- **スクロールリビール**（下部セクション）: 既定で完全表示、IntersectionObserver で in-view 時に `fade-up` を再生。
  observer 未発火でも内容は消えない（堅牢フォールバック）。
- **カードホバー**: `translateY(-4px)` + shadow base→md（200ms ease-snap）。
- **LIVE ティッカー**: `ticker-scroll 100s linear infinite`、hover/focus で一時停止。緑 **pulse-dot 2s** の LIVE インジケータ。
- **受付中ドット / オンライン**: 緑 `pulse-dot 2s`（装飾。状態はテキストでも伝える、A11Y-10）。
- **ロゴ**: `pop-in`（scale .96→1 + opacity, ~0.4s）。
- 入場の主役は CSS keyframe（堅牢性）。`motion/react` は補助に限定。

---

## 6. Border & Shadow Guidelines

- 角丸: ボタン/入力 `base 10px`、カード `2xl 16px`、ヒーロー/大型パネル `3xl 24px`、タグ/ピル `full`。
- シャドウは控えめ4段（sm/base/md/lg）。**過剰ドロップシャドウ・グロー禁止**。カードは base、ホバーで md まで。
- 装飾枠は gray-200（情報伝達でない）。フォーカス枠は navy リング + gray-400 境界。

---

## 7. Accessibility Guidelines

- WCAG 2.1 AA。本文 4.5:1、大文字/UI 3:1（§3.3 検証済）。
- 全インタラクティブ要素に `focus-visible` リング（navy）と論理的フォーカス順序。
- フォームは `label` 関連付け、エラーはテキスト + `aria-describedby` + `aria-invalid`。
- 動的UI（フィルタ結果件数、通知、モーダル）に `aria-live` / 適切な role。
- ランドマーク（header/nav/main/footer）、h1 は1ページ1つ。
- タッチターゲット 44×44px 以上。
- 色のみに依存しない（状態はアイコン+テキスト）。

---

## 8. Anti-Patterns (NEVER)

- フォント: Inter / Roboto / Arial
- カラー: 白背景の紫グラデーション
- コントラスト: brand-yellow/green/orange 上の白い小文字（navy/black/`-strong`/`-fg` を使う）
- エフェクト: 過剰なドロップシャドウ、グロー効果
- レイアウト: 予測可能なテンプレレイアウト（リズムを変える）
- 質感: 黒背景＋ネオン、占いステレオタイプの過剰演出

---

*CCAGI SDK Phase 2 — UI Guidelines / 占いクラウド リニューアル（brighty.site 実測準拠）*
