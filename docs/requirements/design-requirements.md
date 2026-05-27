# 占いクラウド リニューアル — デザイン要件定義書

> **v1.4.0 更新 (本家ブランド忠実化)**: 美的方向性は「本家 uranai.cloud のブランド
> （teal 主色 / rose ヒーロー帯 / gold ★ / ink ロゴ・本文・主CTA=黒 / 黄道十二宮の天体モチーフ）
> を継承しつつ、brighty 水準のレイアウト/余白/モーション品質を被せる」。旧 brighty 暖色
> （coral/navy）記述は uranai 実配色に置換。詳細トークンは `docs/design/design-system.yml` (v1.4.0)。

| 項目 | 内容 |
|------|------|
| プロジェクト | 占いクラウド（www.uranai.cloud）全面リニューアル |
| ドキュメント | デザイン要件（Design Requirements） |
| Phase | Phase 1: 要件定義（Phase 2 でブランドパレット/フォントを実測値に補正） |
| 参照サイト | `brighty.site`（コーチングマッチング） |
| バージョン | 1.1.0 |
| 作成日 | 2026-05-26 |
| 更新日 | 2026-05-26（Phase 2: brighty.site 実測トークンへ補正） |
| SSOT Issue | [#1](https://github.com/ryoma3736/uranai-cloud-renewal/issues/1) |
| ステータス | Draft（レビュー待ち） |

> **【Phase 2 補正 / v1.1.0】**: 本書 v1.0.0 は WebFetch 段階の推測に基づき「白基調＋ブルーアクセント」としていたが、`brighty.site` のコンパイル済み CSS から抽出した**実測の正ブランドパレットは暖色系（coral orange プライマリ + navy）**であることが判明した。占いの世界観に求める「上質・信頼・温かみ」のトーンは、藍ブルーよりも **navy（落ち着き・信頼）＋ coral orange（温かみ・親しみ）** の組合せの方が適合する。本 v1.1.0 で §3 配色・§4 タイポグラフィを実測値へ補正し、Phase 2 `design-system.yml` の確定値と一致させた。

---

## 1. 美的方向性（Aesthetic Direction）

### 1.1 トーン & ムード

| 項目 | 方向性 |
|------|--------|
| Tone | clean-trustworthy（清潔・信頼）× warm-refined（温かみ・上質） |
| Mood | 安心して相談できるプロフェッショナルさに、人肌の温かみを添える。占いの神秘性を「重い／怪しい」ではなく「上質で穏やか・親しみやすい」に表現 |
| Differentiation | **白〜オフホワイト基調のミニマルUIに、`navy（信頼・落ち着き）` をベース、`coral orange（温かみ・親しみ）` を主アクセント／CTA として表現する。** 占いサイトにありがちな黒背景・紫グラデ・派手な装飾を排し、コーチングプラットフォーム（brighty）水準の洗練さで「温かく信頼できる相談相手を見つける場所」という印象を与える。暖色のコーラルは「相談へのハードルを下げる親しみ」を、navy は「占い師の専門性・信頼」を担保する役割分担 |

### 1.2 brighty.site から踏襲する構造原則

参照サイト `brighty.site` の以下の設計言語を踏襲する（コーチング → 占いへドメイン適応）。

| 踏襲要素 | brighty | 占いクラウドへの適応 |
|---------|---------|---------------------|
| ヒーロー | 大きな余白＋簡潔なキャッチ＋主CTA | 「あなたに合う占い師を見つけよう」＋「占い師を探す／無料で相談する」 |
| 統計ダッシュボード | 利用者数・満足度等の数値 | 登録占い師数・累計鑑定数・占術カテゴリ数・平均満足度 |
| カテゴリグリッド | 5つの相談カテゴリカード | 15占術カテゴリのカードグリッド |
| 3ステップCTA | 登録→相談→体験 | 登録／相談 → マッチング → 予約リクエスト |
| アドバイザー相談導線 | 無料相談でコーチをマッチング | 「占い師選びを相談する」マッチング相談（機能要件 B-6） |
| 全体の質感 | 広い余白・カード分離・高コントラストCTA | 同様。占いらしい上品さをアクセント色と装飾で付与 |

---

## 2. レイアウト原則（Layout Principles）

- [ ] LAY-1: **広い余白を恐れない。** 各セクションに十分な縦余白を与え、要素に「呼吸の空間」を持たせる
- [ ] LAY-2: **カードベースのコンテンツ分離。** 占い師・サービス・ブログ・カテゴリはカードで明確に区切る
- [ ] LAY-3: **明確な視覚階層。** 1ページ1つの主役（ヒーロー or 主CTA）を持ち、視線誘導を設計する
- [ ] LAY-4: **グリッドの一貫性。** 8px グリッドシステムを基準に余白・サイズを揃える
- [ ] LAY-5: **モバイルファースト。** 縦1カラムを基準に、ブレークポイントで段階的に多カラム化する
- [ ] LAY-6: **コンテンツ幅の上限。** 本文・記事は可読性のため最大幅（約 65–75 字相当）を設ける
- [ ] LAY-7: **z-index は段階管理。** 重なり順を設計値（base / dropdown / sticky / modal / toast）で定義する
- [ ] LAY-8: **予測可能なテンプレレイアウトを避ける。** 単調な「ヒーロー＋3カラム×無限」を避け、セクションごとにリズム（フル幅／カード列／統計バンド）を変える

---

## 3. 配色方針（Color Palette）— brighty.site 実測値（v1.1.0 補正）

### 3.1 基本思想

**白〜オフホワイト基調 + navy ベース + coral orange アクセント。** `brighty.site` のコンパイル済み CSS から抽出した実測ブランドパレットに準拠する。占いの神秘性・専門性は `navy #222233`（見出し・フッター・ダーク面）で「上質・信頼」に、相談への親しみ・温かみは `coral orange #e2734d`（プライマリ CTA・主アクセント）で表現する。shadcn/ui のベース（primary/secondary/muted）はニュートラルグレースケールとし、**ブランド暖色はアクセントとして適用**する設計。WCAG AA（本文 4.5:1、大文字・UI 3:1）を全組み合わせで満たすため、テキスト用途には彩度を保った濃色派生トークン（`-strong` / `-fg`）を併用する。

### 3.2 カラートークン（brighty.site 実測確定値 — Phase 2 `design-system.yml` と一致）

#### ブランドカラー（実測）

| 役割 | トークン | Hex | 用途 | WCAG メモ |
|------|---------|-----|------|----------|
| Navy | `brand-navy` | `#222233` | 見出し・フッター・ダーク面・本文濃色 | on #fff = 15.62:1（AAA） |
| **Coral Orange（プライマリ）** | `brand-orange` | `#e2734d` | **プライマリ CTA / 主アクセント（塗り）** | white 文字は大文字/UI(3:1)で可。小文字白文字・テキスト用途は `-strong` を使用 |
| Orange Strong | `brand-orange-strong` | `#c2410c` | 小サイズの白文字ボタン・**リンク文字色**（on #fff = 5.18:1, AA 本文 PASS） | テキスト/小要素の AA 担保用派生色 |
| Orange Light | `brand-orange-light` | `#ee9272` | ホバー・装飾・グラデ無しの淡い強調（塗りのみ／文字非使用） | 文字背景としては navy 文字併用 |
| Orange Pale | `brand-orange-pale` | `#fbf3ef` | 暖色の淡い背景（セクション区切り・タグ背景） | navy 文字 14.26:1（AAA） |
| Green（セカンダリ/成功・塗り） | `brand-green` | `#5ba97b` | セカンダリ・成功状態の塗り／バッジ（large/装飾） | 白文字 2.84（塗り装飾のみ。成功テキストは `success-fg`） |
| Green FG（成功テキスト） | `success-fg` | `#27704d` | 成功状態のテキスト・アイコン（on #fff = 5.98:1, AA PASS） | テキスト用 AA 担保 |
| Warm Yellow（アクセント・塗り） | `brand-yellow` | `#d4a054` | アクセント・バッジ・星モチーフ（navy/black 文字併用） | navy 文字 6.66:1（AA）/ black 文字 8.89:1（AAA） |
| Warning FG（警告テキスト） | `warning-fg` | `#946018` | 警告状態のテキスト（on #fff = 5.32:1, AA PASS） | テキスト用 AA 担保 |
| Black Main | `brand-black` | `#020100` | 最濃テキスト・brand-yellow 上の文字 | — |

#### ニュートラル（shadcn ベース・グレースケール）

| 役割 | トークン | Hex | 用途 | WCAG メモ |
|------|---------|-----|------|----------|
| Background (light) | `background` | `#fafafa`(gray-50) | ページ背景（わずかに暖色寄りのオフホワイト） | navy 文字 14.96:1 |
| Surface | `surface` | `#ffffff` | カード・パネル | — |
| Muted bg | `muted` | `#f3f4f6`(gray-100) | セクション区切り・タグ背景 | navy 文字 PASS |
| Border (decorative) | `border` | `#e8e9ed`(gray-200) | カード枠・区切り線（装飾） | 1.21:1 = 装飾用途のみ（情報伝達に使わない） |
| Border (functional/UI) | `border-strong` | `#9ca3af`(gray-400) | フォーカス枠・入力境界など UI 3:1 必要箇所 | 2.54:1 ※下記注記参照 |
| Text primary | `text` | `#222233`(brand-navy) | 本文（背景 #fafafa 上で 14.96:1, AAA） | AAA |
| Text secondary | `text-muted` | `#6b7280`(gray-500) | 補助テキスト（on #fff = 4.83:1, AA PASS） | AA |
| Text disabled/placeholder | `text-faint` | `#9ca3af`(gray-400) | プレースホルダ（非情報・装飾扱い。値入力は text を使用） | 2.54:1（プレースホルダ例外） |
| Danger | `danger` | `#c0392b` | 辞退・エラーのテキスト/塗り（on #fff = 5.44:1, AA PASS） | AA |

### 3.3 WCAG コントラスト検証結果（Phase 2 実測・自前計算）

> 計算は WCAG 2.1 相対輝度アルゴリズムで自前実施（`brand_check_color` MCP がライセンス検証失敗のため）。

| 組合せ | 比率 | 判定 | 措置 |
|--------|------|------|------|
| white on `brand-orange #e2734d` | 3.09:1 | 本文 AA FAIL / 大文字・UI PASS | プライマリ CTA は**塗り（UI 3:1）+ 大きめ/太字ラベル**運用。小サイズ白文字は `brand-orange-strong #c2410c`（5.18:1）に切替 |
| white on `brand-orange-strong #c2410c` | 5.18:1 | 本文 AA PASS | 小ボタン・リンク色として採用 |
| `brand-orange-strong #c2410c` on #fff（リンク） | 5.18:1 | 本文 AA PASS | リンク文字色を `brand-orange` ではなく `-strong` に補正 |
| navy `#222233` on #fff / #fafafa / orange-pale | 15.62 / 14.96 / 14.26 | AAA | そのまま |
| white on `brand-green #5ba97b` | 2.84:1 | FAIL | 緑は**塗り装飾/バッジのみ**。成功テキストは `success-fg #27704d`（5.98:1）へ |
| white on `brand-yellow #d4a054` | 2.34:1 | FAIL | 黄の上の文字は **navy（6.66:1）/ black（8.89:1）** を使用。白文字禁止 |
| navy on `brand-yellow #d4a054` | 6.66:1 | AA PASS | バッジ文字に採用 |
| `warning-fg #946018` on #fff | 5.32:1 | AA PASS | 警告テキスト用に `brand-yellow` を濃色化して採用 |
| gray-500 `#6b7280` on #fff | 4.83:1 | AA PASS | 補助テキスト |
| coral `#e2734d` on navy `#222233`（ダーク面 CTA） | 5.05:1 | AA PASS | ダークモード/フッター上の CTA テキスト可 |
| white / gray-300 / gray-400 on navy（ダークモード） | 15.62 / 10.60 / 6.15 | AA/AAA | ダークモード本文・補助に採用 |
| `danger #c0392b` on #fff | 5.44:1 | AA PASS | エラーテキスト（要件 §3.2 の `#B23A48` 4.x を実測 AA 余裕のある `#c0392b` へ補正） |

> **border の注記**: 装飾的なカード枠（gray-200 `#e8e9ed`）は WCAG 上「情報伝達でない隣接色」のため 3:1 不要。フォーカスリング・入力フィールド境界など**状態を伝える UI 境界**は `border-strong`（gray-400）＋ navy のフォーカスリング（`focus-visible:ring-brand-navy`）併用で視認性を確保し、色のみに依存しない（A11Y-10）。

### 3.4 配色ルール

- [ ] COL-1: 背景は白〜オフホワイト（gray-50）を基調とし、暗背景を主役にしない（ダークモードを除く）
- [ ] COL-2: `brand-orange` 系を一貫したアクション色として使う（主CTA は塗り、リンク・小要素文字は `brand-orange-strong`）。`navy` は見出し・信頼面に使う
- [ ] COL-3: 全テキスト／UI 配色は WCAG AA を満たす（§3.3 検証済。`non-functional.md` A11Y-2 と対応）
- [ ] COL-4: ダークモードに対応する（navy `#222233` をベース面に、coral は `#ee9272`/`#e2734d` で 4.5:1 以上を確保。神秘＝黒一辺倒にしない）
- [ ] COL-5: 状態（成功・警告・危険）は色のみに依存せずアイコン・テキストを併用する（A11Y-10）。成功=`success-fg`、警告=`warning-fg`、危険=`danger` のテキスト用派生色を使う

---

## 4. タイポグラフィ方針（Typography）

### 4.1 基本思想（brighty.site 実測値 — v1.1.0 補正）

**brighty.site のフォントスタックに忠実に準拠する。** Latin 見出しは幾何学サンセリフの `Outfit`、Latin 本文は人文サンセリフの `DM Sans`、日本語は `Noto Sans JP`（fallback `Hiragino Sans`）。明朝（Shippori Mincho 等）は v1.0.0 の推測だったが、brighty 忠実度を優先し**サンセリフ統一**へ補正する。占いの「上質・温かみ」はフォントの明朝感ではなく、`Outfit` のクリーンな幾何学形・広い余白・暖色アクセントで表現する。日本語の特別な見出しに明朝系をワンポイント採用する余地は残すが（§4.4）、MVP の基本は Noto Sans JP とする。

### 4.2 フォントスタック（brighty.site 実測確定値 — `design-system.yml` と一致）

| 用途 | フォント | fallback | ウェイト | 意図 |
|------|---------|---------|---------|------|
| 見出し（Latin） | **Outfit** | `system-ui, sans-serif` | 600 / 700 / 800 | 幾何学サンセリフ。ロゴ・H1〜H3・統計数値の見出しに。brighty のヒーロー質感を再現 |
| 本文（Latin） | **DM Sans** | `system-ui, sans-serif` | 400 / 500 / 600 | 人文サンセリフ。本文・ボタン・ラベルの可読性 |
| 日本語（全用途） | **Noto Sans JP** | `"Hiragino Sans", sans-serif` | 300 / 400 / 500 / 600 / 700 / 800 | 見出し・本文・長文（ブログ記事・プロフィール）の高可読性 |
| 数字・統計 | 上記の `tabular-nums` | — | — | 統計ダッシュボード（StatBand）・価格の桁揃え |

> 全ウェイト範囲 300/400/500/600/700/800。いずれも `next/font/google` でセルフホスト・サブセット化する（`non-functional.md` PERF-4）。`font-display: swap`。

### 4.3 タイポグラフィルール

- [ ] TYP-1: Latin 見出しに `Outfit`、Latin 本文に `DM Sans`、日本語に `Noto Sans JP` を用いる（混植時は CSS `font-family` で Latin→JP の順に指定）
- [ ] TYP-2: 本文の日本語は `Noto Sans JP` の高可読性を活かし、長文（ブログ・プロフィール）で十分な行送り（line-height 1.7 目安）を確保する
- [ ] TYP-3: 見出しに `text-balance` を適用し折返しを整える。字間（letter-spacing）は見出しで微調整
- [ ] TYP-4: 統計・価格などの数字は `tabular-nums` で桁を揃える（StatBand・ServiceCard 価格）
- [ ] TYP-5: フォントサイズはモジュラースケールで定義する（§4.5 / `design-system.yml` で確定）
- [ ] TYP-6: 行長は本文で 65–75 字相当に収め可読性を保つ（LAY-6 と対応。ブログ本文は max-width 約 42rem）
- [ ] TYP-7: **禁止フォント**（Inter / Roboto / Arial）を一切使用しない（§8）。fallback も `system-ui` を用い Arial を明示しない

### 4.4 明朝アクセントの扱い（任意・限定）

占いの世界観を強調したい特別な見出し（例: ブログ記事タイトルの装飾、ヒーローのキャッチ一部）に、日本語明朝系（候補: `Shippori Mincho`）を**限定的なアクセント**として採用してよい。ただし brighty 忠実度を最優先とし、MVP の既定は全面 `Noto Sans JP`。明朝採用時も追加フォント読み込みを `next/font` でサブセット化し PERF を損なわない。

### 4.5 タイプスケール（モジュラー・1.25 比）

| トークン | サイズ | 行間 | 用途 |
|---------|--------|------|------|
| display | 3.0rem(48px) | 1.1 | ヒーロー H1 |
| h1 | 2.25rem(36px) | 1.15 | ページ見出し |
| h2 | 1.75rem(28px) | 1.2 | セクション見出し |
| h3 | 1.375rem(22px) | 1.3 | カード見出し |
| h4 | 1.125rem(18px) | 1.4 | サブ見出し |
| body-lg | 1.125rem(18px) | 1.7 | 本文（記事） |
| body | 1rem(16px) | 1.7 | 本文 |
| sm | 0.875rem(14px) | 1.5 | 補助・キャプション |
| xs | 0.75rem(12px) | 1.4 | タグ・メタ |

---

## 5. 余白・スペーシング方針

- [ ] SPC-1: 8px を基準単位とするスペーシングスケール（4 / 8 / 16 / 24 / 32 / 48 / 64px）を用いる
- [ ] SPC-2: セクション間は大きめの余白（48–96px 相当）でゆとりを持たせる（brighty の広い余白を踏襲）
- [ ] SPC-3: カード内は内側余白を一定にし、要素を詰め込みすぎない
- [ ] SPC-4: モバイルでは余白を段階的に縮小しつつ、窮屈にならない最小値を保つ

---

## 6. コンポーネント方針

### 6.1 技術前提

| 項目 | 採用 |
|------|------|
| UIライブラリ | shadcn/ui |
| スタイリング | Tailwind CSS（デザイントークン経由） |
| アニメーション | CSS keyframe（入場/シグネチャの主役・堅牢）+ motion/react（補助） |
| アイコン | lucide-react（占術モチーフは必要に応じカスタムSVG） |
| ユーティリティ | `cn`（class結合） |

### 6.2 主要コンポーネント（Phase 2 で詳細仕様化）

| コンポーネント | 用途 |
|--------------|------|
| Hero | トップのヒーローセクション |
| StatBand | 統計ダッシュボード（数値カード横並び） |
| CategoryCard / CategoryGrid | 15占術カテゴリのカードグリッド |
| AdvisorCard / AdvisorGrid | 占い師カード一覧 |
| ServiceCard | 鑑定サービスカード |
| StepFlow | 3ステップCTA |
| FilterPanel | 検索・カテゴリ・相談形式フィルタ |
| MatchingForm | マッチング相談フォーム（B-6） |
| BookingRequestForm | 予約リクエストフォーム（B-7） |
| ArticleCard / ArticleGrid | ブログ記事カード |
| RichTextEditor | WYSIWYG エディタ（記事投稿 C-2） |
| Badge / Tag | 占術タグ・相談形式・状態表示 |
| EmptyState | 空状態（検索0件等） |

### 6.3 コンポーネントルール

- [ ] CMP-1: shadcn/ui プリミティブをベースにし、独自スタイルはデザイントークン経由で適用する
- [ ] CMP-2: すべてのインタラクティブ要素にアクセシブルなラベル・フォーカス状態を持たせる（A11Y-4/5/7）
- [ ] CMP-3: アニメーションはコンポジタプロパティ（transform / opacity）のみ。duration は二層
      （v1.2.0, brighty 動的デザイン強化）= **入場演出 ≤ 700ms**（ロード時カスケード / スクロールリビール /
      ロゴ pop-in）／ **マイクロ操作 ≤ 200ms**（hover / press）。easing は ease-snap=cubic-bezier(.22,1,.36,1)。
      継続アニメ（LIVE ティッカー / pulse-dot）は許容（reduced-motion で停止）。CLS/LCP は不変。
- [ ] CMP-4: `prefers-reduced-motion: reduce` で全演出を即時最終状態に抑制する（A11Y-9）。
      ティッカー静止・pulse 停止・入場カスケード無効・下部セクションも常に可視。
- [ ] CMP-5: ローディング・空・エラーの各状態を全リスト系コンポーネントで定義する

---

## 7. レスポンシブ方針

`non-functional.md` §5 と整合。デザイン観点の補足:

- [ ] RWDD-1: モバイルファーストでデザインカンプ・実装を行う
- [ ] RWDD-2: カードグリッドは 1（sm未満）→ 2（sm）→ 3（lg）→ 4（xl）列で段階変化させる
- [ ] RWDD-3: ヒーローはモバイルで縦積み、デスクトップで横並び（テキスト＋ビジュアル）に再構成する
- [ ] RWDD-4: ナビゲーションはモバイルでハンバーガー、デスクトップで水平メニュー
- [ ] RWDD-5: タッチターゲット 44px 以上（A11Y-8）

---

## 8. 禁止事項（Anti-Patterns — NEVER）

CCAGI ブランドガイドライン／Phase 2 規約に準拠。以下は **絶対に使用しない**。

| カテゴリ | 禁止 | 理由 |
|---------|------|------|
| フォント | **Inter / Roboto / Arial** | AI slop。brighty 実測の Outfit / DM Sans / Noto Sans JP を使用（§4） |
| カラー | **白背景の紫グラデーション** | AI slop。占い＝紫の安易な連想を避け、暖色 coral orange + navy で差別化 |
| カラー | brand-yellow / brand-green / brand-orange 上の**白文字（小サイズ）** | コントラスト不足（§3.3）。navy/black 文字または `-strong`/`-fg` 派生色を使う |
| エフェクト | **過剰なドロップシャドウ** | AI slop。影は最小限・自然に（§ shadows は base/sm/md/lg の控えめ4段） |
| エフェクト | **グロー効果** | AI slop。神秘性は配色・余白・タイポで表現する |
| レイアウト | **予測可能なテンプレレイアウト** | 差別化不足。セクションごとにリズムを変える（LAY-8） |
| 質感 | 黒背景＋ネオン／占いステレオタイプの過剰演出 | 信頼感を損なう。clean-trustworthy + warm-refined を維持 |

---

## 9. 品質基準（デザイン観点）

| 項目 | 基準 |
|------|------|
| Lighthouse Performance | 90+ |
| Lighthouse Accessibility | 100 |
| WCAG 準拠レベル | AA |
| コントラスト比（本文） | 4.5:1 以上 |
| コントラスト比（大文字・UI） | 3:1 以上 |
| 禁止パターン（§8） | 0件 |
| ダークモード | 対応（藍ベース） |

---

## 10. Phase 2 への引き継ぎ

本書を入力として Phase 2 で以下を生成・確定する。

| 生成物 | コマンド | 内容 |
|--------|---------|------|
| `docs/design/design-system.yml` | `/design-system` | カラー・タイポ・スペーシング・トークンの確定値 |
| `docs/design/ui-guidelines.md` | `/frontend-design` | UI設計方針の詳細 |
| `docs/design/component-specs/` | `/frontend-design` | 主要コンポーネント詳細仕様（§6.2） |
| `docs/design/responsive-guidelines.md` | `/design-system` | レスポンシブ詳細 |

> **【v1.1.0 完了】** §3.2 のカラー Hex（brighty 実測暖色系）・§4.2 のフォント（Outfit / DM Sans / Noto Sans JP）は Phase 2 で WCAG コントラストを自前計算（§3.3）で検証し**確定**済み。`design-system.yml` の確定値と一致する。

---

## 11. 関連ドキュメント

| ドキュメント | パス |
|------------|------|
| 機能要件 | `docs/requirements/requirements.md` |
| 非機能要件 | `docs/requirements/non-functional.md` |

---

*CCAGI SDK Phase 1 — デザイン要件定義書 / 占いクラウド リニューアル（brighty.site 準拠）*
