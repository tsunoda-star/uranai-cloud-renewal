# Component Spec — StatBand

| 項目 | 値 |
|------|-----|
| 名称 | StatBand（統計ダッシュボード） |
| ベース | Card（数値カード横並び） |
| 配置 | トップ（ヒーロー直下） |
| 対応 AC | AC-A1-2 |

## 用途
信頼指標を数値で提示（brighty の統計バンド踏襲）。

## 表示項目（DB集計値 / 運営設定値 — ハードコード禁止）
| 指標 | ソース |
|------|--------|
| 登録占い師数 | `FortuneTellerProfile` の公開件数 COUNT |
| 累計鑑定数 | `ConsultationRequest` accepted COUNT（または運営設定） |
| 占術カテゴリ数 | `DivinationCategory` COUNT（=15） |
| 平均満足度 | `Review.rating` AVG（評価データ存在時。無ければ非表示） |

## Props
```
StatBandProps {
  stats: { label: string; value: number; unit?: string; format?: 'int'|'decimal' }[]
}
```

## スタイル
- 背景: brand-orange-pale の帯（セクションリズム変化、LAY-8）
- 数値: Outfit 700, `tabular-nums`, navy, display/h1 サイズ
- ラベル: sm, text-muted

## レスポンシブ
- base: 2×2 グリッド / md+: 横並び4

## アクセシビリティ
- 各統計は `<dl><dt>ラベル</dt><dd>数値</dd></dl>` 構造で意味付け
- 数値が概数の場合 `aria-label` で正確な文脈を補足

## 禁止
- ハードコード数値（AC-A1-2）、グロー
