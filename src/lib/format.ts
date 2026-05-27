/**
 * Display formatting helpers (JST, tabular-friendly numbers, currency).
 *
 * Numbers are formatted with the `ja-JP` locale so they pair with the
 * `tabular-nums` utility (design-system.yml typography.numeric).
 */

/** Integer with ja-JP thousands separators (e.g. 1234 -> "1,234"). */
export function formatInt(value: number): string {
  return value.toLocaleString("ja-JP");
}

/** JPY price without decimals (e.g. 3000 -> "3,000"). The "円" unit is rendered separately. */
export function formatJpy(value: number): string {
  return value.toLocaleString("ja-JP");
}

/** One-decimal rating (e.g. 4.5 -> "4.5"). */
export function formatRating(value: number): string {
  return value.toFixed(1);
}

/** Publish date as JST `YYYY.MM.DD` for display, paired with a <time datetime>. */
export function formatPublishedDate(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  })
    .format(date)
    .replace(/\//g, ".");
}

/** ISO date (date-only) for the <time datetime> attribute. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** JST date + time as `YYYY.MM.DD HH:mm` for request slots / timestamps. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  })
    .format(date)
    .replace(/\//g, ".");
}

/** Full ISO timestamp for the <time datetime> attribute. */
export function toIsoDateTime(date: Date): string {
  return date.toISOString();
}
