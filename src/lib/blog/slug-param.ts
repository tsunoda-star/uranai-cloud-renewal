/**
 * Next.js dynamic route の slug param を防御的にデコードする。
 *
 * 背景: WP 移管で非 ASCII（日本語）slug が大量に流入。Next.js App Router が
 * dynamic segment を URL エンコードのまま params に渡すケースがあり、
 * DB に保存された decode 済み slug と一致しなくなる（404）。
 *
 * decodeURIComponent は不正な % シーケンスで throw するため try/catch で
 * フォールバック（既に decode 済の生 UTF-8 を再 decode しても無害なので
 * 二重 decode 問題は起きない）。
 */
export function decodeSlugParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
