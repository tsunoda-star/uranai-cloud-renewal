/**
 * Blog slug generation + uniqueness (AC-C2, SEO-16).
 *
 * 方針:
 * - タイトル由来の slug を自動生成。英数字/ハイフンに正規化。日本語など URL に
 *   不向きな文字は除去され、残りが空になる場合は安定したフォールバック（`post`）を使う。
 * - 一意性は DB で担保する。衝突時は `-2`, `-3` … と連番サフィックスを付ける。
 * - 公開後の slug は不変（SEO-16）。呼び出し側（actions）で「公開済みなら slug を
 *   変更しない」を強制する（この関数は候補生成と一意化のみを担う）。
 */

/** slug の最大長（DB 制約はないが SEO/可読性のため抑える）。 */
const SLUG_MAX_LENGTH = 80;

/**
 * 任意文字列を slug 候補に正規化する。
 * - 小文字化、空白→ハイフン、英数字とハイフン以外を除去、連続ハイフン圧縮、両端トリム。
 * - 結果が空なら `post` を返す（日本語のみのタイトル等のフォールバック）。
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "") // 結合文字（アクセント）除去
    .replace(/[^a-z0-9\s-]/g, "") // 英数字/空白/ハイフン以外を除去
    .trim()
    .replace(/[\s_]+/g, "-") // 空白/アンダースコア→ハイフン
    .replace(/-+/g, "-") // 連続ハイフン圧縮
    .replace(/^-+|-+$/g, ""); // 両端ハイフン除去

  const trimmed = base.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, "");
  return trimmed.length > 0 ? trimmed : "post";
}

/** slug 形式として妥当か（手動上書きの検証用）。 */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= SLUG_MAX_LENGTH;
}

/**
 * `desired` を起点に、`isTaken(slug)` が false になる一意な slug を生成する。
 * 衝突時は `desired-2`, `desired-3` … を試す。`isTaken` は DB 照会（自記事は
 * 衝突から除外する判定を呼び出し側で行う）。
 */
export async function makeUniqueSlug(
  desired: string,
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  const base = slugify(desired);
  if (!(await isTaken(base))) return base;
  // 連番サフィックスで一意化（上限を設けて無限ループを防ぐ）。
  for (let n = 2; n <= 1000; n++) {
    const candidate = `${base}-${n}`.slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, "");
    if (!(await isTaken(candidate))) return candidate;
  }
  // 1000 件衝突は事実上ありえないが、最後の手段としてタイムスタンプを付与。
  return `${base}-${Date.now().toString(36)}`.slice(0, SLUG_MAX_LENGTH);
}
