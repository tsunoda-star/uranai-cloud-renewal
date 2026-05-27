import type { Metadata, Viewport } from "next";

import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { StagingBanner } from "@/components/layout/staging-banner";
import { SplashIntro } from "@/components/brand/splash-intro";

// The global header resolves the auth session from request cookies/headers
// (DevAuthProvider in dev). Auth is therefore request-scoped on every route, so
// the app shell is rendered dynamically rather than statically prerendered.
// This also keeps the ADR-3 prod guard from firing during build-time prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — 温かく信頼できる相談相手を見つける`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

// theme-color (SEO-7 / PWA-ish browser chrome tint). Uses brand-ink
// (#212529, design-system.yml v1.4.0 / uranai 実配色) so the mobile browser UI
// matches the header/footer. In Next 15 themeColor lives on the `viewport`
// export, not `metadata` (placing it on metadata is deprecated and warns at build).
export const viewport: Viewport = {
  themeColor: "#212529",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={fontVariables} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        {/* Opening splash: client-only, once/session, skippable, reduced-motion
            aware. Rendered first so it overlays everything; it never appears in
            SSR output, so the page below stays SEO/LCP/CLS-neutral. */}
        <SplashIntro />
        <StagingBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
