/**
 * Site-wide configuration. The absolute URL base (OPEN-1 unblock track) is read
 * from NEXT_PUBLIC_SITE_URL so OGP / canonical / sitemap can emit absolute URLs
 * before the production domain is finalized.
 */
export const siteConfig = {
  name: "占いクラウド",
  description:
    "温かく信頼できる相談相手を見つける。占い師カタログ・予約・コラムを一つに。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

/** Resolve a path to an absolute URL using the configured site origin. */
export function absoluteUrl(path: string): string {
  const base = siteConfig.url.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
