import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Tailwind configuration for uranai-cloud-renewal.
 *
 * Tokens are derived from docs/design/design-system.yml (v1.4.0), extracted from
 * the live uranai.cloud brand (teal #34cccc + rose hero band + gold ★ + ink/black
 * CTA). shadcn/ui base maps to CSS variables defined in src/app/globals.css; brand
 * tokens are exposed directly for accents.
 * WCAG AA verified combinations are documented in the design-system.yml comments.
 *
 * Anti-patterns (forbidden, see design-system.yml): Inter / Roboto / Arial fonts,
 * purple-gradient-on-white, excessive drop-shadow / glow.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "96rem",
      },
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        // --- shadcn/ui semantic tokens (CSS variables, support dark mode) ---
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // --- brand palette (live uranai.cloud measured values, design-system.yml v1.4.0) ---
        // WCAG AA verified (see design-system.yml §colors comments + /tmp/uranai-rebrand/wcag*.mjs):
        //   ink         #212529  on #fff 15.43:1 (AAA) — body/heading/PRIMARY CTA fill (本家=黒CTA)
        //   teal        #34cccc  on #fff  1.97:1 — FILL/装飾のみ (white-on-teal はテキスト不可)
        //   teal-strong #0d7373  on #fff  5.65:1 (AA text) — link/icon/AA text on white & pale
        //   teal-light  #5fd6d6  decorative hover / dark-surface accent
        //   teal-pale   #e6f7f7  soft surface (icon discs)
        //   rose-pale   #fdf2f4  hero band / soft surface (gray-500 4.42:1 = secondary, ≧ old 4.41)
        //   rose-mid    #f8d7da  hero band gradient stop
        //   gold        #efbf2f  ★ fill/装飾のみ (on #fff 1.73 — テキスト不可)
        //   gold-text   #8f6c00  on #fff 4.87:1 (AA text) — gold AA テキスト派生
        //   blue        #0c75b0  on #fff 5.02:1 (AA text) — リンク (本家 #0e83c5 を AA 派生)
        //   red         #f34f5f  on #fff 3.45:1 — 限定アクセント FILL/large-UI のみ
        //   red-text    #cc2233  on #fff 5.46:1 (AA text) — red AA テキスト派生
        brand: {
          ink: "#212529",
          teal: "#34cccc",
          "teal-strong": "#0d7373",
          "teal-light": "#5fd6d6",
          "teal-pale": "#e6f7f7",
          "rose-pale": "#fdf2f4",
          "rose-mid": "#f8d7da",
          gold: "#efbf2f",
          "gold-text": "#8f6c00",
          blue: "#0c75b0",
          red: "#f34f5f",
          "red-text": "#cc2233",
        },
        // gray 50–700 (used for surfaces, borders, secondary text)
        gray: {
          50: "#fafafa",
          100: "#f3f4f6",
          200: "#e8e9ed",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
        },
        // --- state foreground colors (AA-safe text variants) ---
        state: {
          "success-fg": "#27704d",
          "warning-fg": "#946018",
          danger: "#c0392b",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "var(--font-jp)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "var(--font-jp)", "system-ui", "sans-serif"],
        jp: ["var(--font-jp)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-jp)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // design-system.yml typography.scale
        xs: ["0.75rem", { lineHeight: "1.4" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.7" }],
        "body-lg": ["1.125rem", { lineHeight: "1.7" }],
        h4: ["1.125rem", { lineHeight: "1.4" }],
        h3: ["1.375rem", { lineHeight: "1.3" }],
        h2: ["1.75rem", { lineHeight: "1.2" }],
        h1: ["2.25rem", { lineHeight: "1.15" }],
        display: ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        display: "-0.02em",
        heading: "-0.01em",
        jp: "0.02em",
      },
      spacing: {
        // 8px grid (design-system.yml spacing.scale)
        "2xs": "4px",
        xs: "8px",
        sm: "16px",
        md: "24px",
        lg: "32px",
        xl: "48px",
        "2xl": "64px",
        "3xl": "96px",
      },
      borderRadius: {
        // brighty measured radii (design-system.yml borders.radius)
        // shadcn convention: lg/md/sm derived from --radius
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "2px",
        base: "0.625rem", // 10px
        "radius-md": "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      maxWidth: {
        container: "80rem", // 1280px
        wide: "96rem", // 1536px
        content: "42rem", // blog body 65-75 chars
      },
      boxShadow: {
        // restrained 4-step scale (no excessive shadow / glow). ink #212529 = rgb(33,37,41).
        sm: "0 1px 2px rgba(33, 37, 41, 0.05)",
        base: "0 1px 3px rgba(33, 37, 41, 0.08), 0 1px 2px rgba(33, 37, 41, 0.04)",
        md: "0 4px 6px rgba(33, 37, 41, 0.08)",
        lg: "0 10px 20px rgba(33, 37, 41, 0.08)",
      },
      blur: {
        sm: "8px",
        md: "12px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },
      zIndex: {
        dropdown: "1000",
        sticky: "1100",
        overlay: "1200",
        modal: "1300",
        toast: "1400",
      },
      transitionTimingFunction: {
        // brighty snap-decelerate. Used by micro-interactions (hover/press).
        snap: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // brighty entrance language (design-system.yml v1.2.0 motion section).
        // Compositor-only props (transform/opacity); never animate layout.
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.82)" },
        },
        "ticker-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        // micro-interactions (<= 200ms, design-system.yml animation_rules)
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // entrance (<= 700ms) — `both` keeps the final state without JS
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "pop-in": "pop-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
        // signature loops
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        ticker: "ticker-scroll 100s linear infinite",
      },
    },
  },
  plugins: [animate],
};

export default config;
