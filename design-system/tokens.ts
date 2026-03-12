/**
 * Shared token types for the multi-brand design system.
 * All themes implement BrandTheme. Components consume via CSS variables.
 */

export type BrandKey = "keypilot" | "danadube" | "glaab" | "siu";

export interface TypographyToken {
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
}

export interface BrandTheme {
  metadata: {
    key: BrandKey;
    name: string;
    tagline: string;
  };
  colors: {
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryHover: string;
    accent: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
    dangerForeground: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    pill: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
    "5xl": string;
  };
  typography: {
    h1: TypographyToken;
    h2: TypographyToken;
    h3: TypographyToken;
    h4: TypographyToken;
    body: TypographyToken;
    small: TypographyToken;
    caption: TypographyToken;
  };
}
