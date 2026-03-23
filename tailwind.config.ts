import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./design-system/**/*.{js,ts,jsx,tsx,mdx}",
    // New KP design system modules (Phase 1+)
    "./components/modules/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── shadcn / existing tokens (do not remove) ───────────────────────
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
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // ── KeyPilot dark design system tokens (kp-*) ─────────────────────
        // 3-tier dark surface hierarchy + gold/teal accent palette.
        // Hardcoded hex so Tailwind opacity modifiers (bg-kp-gold/10) work.
        // Do not alter the existing tokens above.
        kp: {
          bg:      "#0B1120", // base background — deepest surface
          surface: {
            DEFAULT: "#151E2E", // tier 1 — cards, panels
            high:    "#1C2840", // tier 2 — raised elements, table headers
            higher:  "#253254", // tier 3 — most elevated (modals, dropdowns)
          },
          gold: {
            DEFAULT: "#C9A84C", // primary action, platform emphasis
            bright:  "#E8C76A", // hover / high-emphasis gold
            muted:   "#3A2F15", // gold tint background
          },
          teal: {
            DEFAULT: "#2DD4BF", // module highlights, interactive accents
            muted:   "#0A2421", // teal tint background
          },
          "chart-teal": "#14B8A6", // chart / data-vis teal
          "on-surface": {
            DEFAULT: "#F1F5F9", // primary text on dark surface
            variant: "#8FA3BF", // secondary / muted text on dark surface
          },
          outline: {
            DEFAULT: "#2A3850", // borders, dividers
            variant: "#1C2840", // subtle / low-emphasis dividers
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // headline: Newsreader (editorial / product headings in new design system)
        // body/sans: Inter (unchanged — existing app default)
        headline: ["var(--font-newsreader)", "Georgia", "ui-serif", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
