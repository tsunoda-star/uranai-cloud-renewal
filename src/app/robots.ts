import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * robots.txt (SEO-14, spec §2).
 *
 * Crawlers may index every public marketing surface (catalog / blog / match).
 * Auth-gated and operational areas are excluded:
 *   - /advisor/ : 占い師ダッシュボード（要認証）。⚠️ trailing slash で書くことで、
 *                 公開カタログの /advisors（占い師一覧）を巻き込まないようにする。
 *   - /admin    : 運営ダッシュボード（要認証）
 *   - /mypage   : マイページ（要認証）
 *   - /dev      : dev 専用ログイン/ログアウト（本番では起動しない, ADR-3）
 *   - /booking  : 予約リクエストフォーム（要認証フロー）
 *   - /login, /register : 認証フロー
 *   - /api      : Route Handlers（クロール対象外）
 *
 * Sitemap is advertised as an absolute URL (NEXT_PUBLIC_SITE_URL, OPEN-1).
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/advisor/",
        "/admin",
        "/mypage",
        "/dev",
        "/booking",
        "/login",
        "/register",
        "/api",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
