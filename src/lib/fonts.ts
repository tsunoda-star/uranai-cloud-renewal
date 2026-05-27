import { Outfit, DM_Sans, Noto_Sans_JP } from "next/font/google";

/**
 * Typography (design-system.yml v1.1.0, brighty.site measured).
 * - Outfit: headings (Latin)
 * - DM Sans: body (Latin)
 * - Noto Sans JP: Japanese (headings + body)
 *
 * Forbidden fonts (anti-pattern): Inter / Roboto / Arial — NOT used here.
 * Exposed as CSS variables consumed by tailwind.config.ts fontFamily.
 */

export const fontHeading = Outfit({
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
  variable: "--font-heading",
});

export const fontBody = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const fontJp = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jp",
});

export const fontVariables = `${fontHeading.variable} ${fontBody.variable} ${fontJp.variable}`;
