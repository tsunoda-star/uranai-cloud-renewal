import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Type checking and linting are run as dedicated scripts (npm run typecheck / lint)
  // in CI; the production build relies on those gates, so we keep build fast and
  // deterministic. Errors are still enforced — see package.json scripts.
  eslint: {
    // `npm run lint` is the authoritative gate; avoid double-linting during build.
    ignoreDuringBuilds: true,
  },

  /**
   * 占い師アバター実写真のホスト許可（本家 uranai.cloud 資産 = ユーザー所有のリニューアル対象）。
   * デモ seed はローカル取得済み (public/avatars/real-*.png) を使うが、W4 データ移行で
   * 実 URL (asset.matchingcloud.com/user/*.png, /site/*.png) をそのまま photoUrl に
   * 保持できるよう、next/image 用に remotePatterns を許可する。
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asset.matchingcloud.com",
        pathname: "/user/**",
      },
      {
        protocol: "https",
        hostname: "asset.matchingcloud.com",
        pathname: "/site/**",
      },
    ],
  },

  /**
   * 旧URL → 新URL 301（SEO-16/17, spec §13.3）。正本は docs/design/url-migration-map.md。
   *
   * ここに置けるのは「パス 1:1（id 非依存）の恒久リダイレクト」**のみ**。
   * id↔slug の対応（`/items/categories/[id]`, `/profiles/categories/[id]`,
   * `/users/[id]`, `contents.uranai.cloud/*`）は OPEN-3（移行元URL/旧id→新slug対応）
   * 確定後に、対応表から生成した静的エントリをこの配列へ追記する。
   * 確定前にワイルドカードのダミー転送を置くと誤送客・404 量産になるため置かない。
   */
  async redirects() {
    return [
      // #1 旧 鑑定メニュー一覧 → 新 サービス一覧（移行元確定済 / id 非依存）。
      { source: "/items", destination: "/services", permanent: true },
      // #2 旧 占い師一覧 → 新 占い師一覧（移行元確定済 / id 非依存）。
      { source: "/profiles", destination: "/advisors", permanent: true },
      // ── 以下は OPEN-3 確定後に対応表から追記（現時点では実装しない）──
      //   #3 /items/categories/:id   → /services?category=:slug
      //   #4 /profiles/categories/:id → /advisors/categories/:slug
      //   #5 /users/:id              → /advisors/:slug
      //   #6 contents.uranai.cloud/* → /blog/:slug（ホスト書換は CDN/プロキシ層）
    ];
  },
};

export default nextConfig;
