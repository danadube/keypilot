import type { BrandTheme } from "../tokens";

export const keypilotTheme: BrandTheme = {
  metadata: {
    key: "keypilot",
    name: "KeyPilot",
    tagline: "Smart property operations, organized",
  },
  colors: {
    // Brand-aligned core palette
    // Primary navy: structure, key accents
    primary: "#1A3672",
    primaryForeground: "#FFFFFF",
    primaryHover: "#162B5A",
    primaryActive: "#112146",
    // Secondary sky: interactions, highlights
    secondary: "#4BAED8",
    secondaryHover: "#3A93B9",
    accent: "#4BAED8",
    // Surfaces
    background: "#F8FAFC", // main canvas
    surface: "#FFFFFF", // cards
    surfaceAlt: "#EDF2F8", // light navy-tinted surface
    border: "#D3E2F0", // very light navy/gray
    text: "#0F172A",
    textMuted: "#64748B",
    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",
    dangerForeground: "#FFFFFF",
    // Semantic structural colors for shells/heroes
    sidebarBg: "#0B1A3C",
    heroBg: "#E6F1FB",
    heroRing: "#4BAED8",
  },
  // TODO: Load Inter via next/font: import { Inter } from "next/font/google"; Inter({ subsets: ["latin"] })
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, ui-monospace, monospace",
  },
  radius: {
    sm: "8px",
    md: "8px",
    lg: "16px",
    xl: "24px",
    pill: "9999px",
  },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  spacing: {
    xs: "8px",
    sm: "16px",
    md: "24px",
    lg: "32px",
    xl: "40px",
    "2xl": "48px",
    "3xl": "64px",
    "4xl": "80px",
    "5xl": "96px",
  },
  typography: {
    h1: { fontSize: "48px", lineHeight: "56px", fontWeight: 700 },
    h2: { fontSize: "36px", lineHeight: "44px", fontWeight: 600 },
    h3: { fontSize: "32px", lineHeight: "40px", fontWeight: 600 },
    h4: { fontSize: "24px", lineHeight: "32px", fontWeight: 600 },
    body: { fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
    small: { fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
    caption: { fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
  },
};
