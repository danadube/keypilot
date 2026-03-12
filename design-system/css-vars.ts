import type { BrandTheme } from "./tokens";

/**
 * Maps a BrandTheme to CSS custom properties for use in styles.
 */
export function themeToCssVars(theme: BrandTheme): Record<string, string> {
  const vars: Record<string, string> = {
    // Colors
    "--brand-primary": theme.colors.primary,
    "--brand-primary-foreground": theme.colors.primaryForeground,
    "--brand-primary-hover": theme.colors.primaryHover,
    "--brand-primary-active": theme.colors.primaryActive,
    "--brand-secondary": theme.colors.secondary,
    "--brand-secondary-hover": theme.colors.secondaryHover,
    "--brand-accent": theme.colors.accent,
    "--brand-bg": theme.colors.background,
    "--brand-surface": theme.colors.surface,
    "--brand-surface-alt": theme.colors.surfaceAlt,
    "--brand-border": theme.colors.border,
    "--brand-text": theme.colors.text,
    "--brand-text-muted": theme.colors.textMuted,
    "--brand-success": theme.colors.success,
    "--brand-warning": theme.colors.warning,
    "--brand-danger": theme.colors.danger,
    "--brand-danger-foreground": theme.colors.dangerForeground,
    // Fonts
    "--font-heading": theme.fonts.heading,
    "--font-body": theme.fonts.body,
    "--font-mono": theme.fonts.mono,
    // Radius
    "--radius-sm": theme.radius.sm,
    "--radius-md": theme.radius.md,
    "--radius-lg": theme.radius.lg,
    "--radius-xl": theme.radius.xl,
    "--radius-pill": theme.radius.pill,
    // Shadow
    "--shadow-sm": theme.shadow.sm,
    "--shadow-md": theme.shadow.md,
    "--shadow-lg": theme.shadow.lg,
    // Spacing
    "--space-xs": theme.spacing.xs,
    "--space-sm": theme.spacing.sm,
    "--space-md": theme.spacing.md,
    "--space-lg": theme.spacing.lg,
    "--space-xl": theme.spacing.xl,
    "--space-2xl": theme.spacing["2xl"],
    "--space-3xl": theme.spacing["3xl"],
    "--space-4xl": theme.spacing["4xl"],
    "--space-5xl": theme.spacing["5xl"],
    // Typography
    "--text-h1-size": theme.typography.h1.fontSize,
    "--text-h1-line": theme.typography.h1.lineHeight,
    "--text-h1-weight": String(theme.typography.h1.fontWeight),
    "--text-h2-size": theme.typography.h2.fontSize,
    "--text-h2-line": theme.typography.h2.lineHeight,
    "--text-h2-weight": String(theme.typography.h2.fontWeight),
    "--text-h3-size": theme.typography.h3.fontSize,
    "--text-h3-line": theme.typography.h3.lineHeight,
    "--text-h3-weight": String(theme.typography.h3.fontWeight),
    "--text-h4-size": theme.typography.h4.fontSize,
    "--text-h4-line": theme.typography.h4.lineHeight,
    "--text-h4-weight": String(theme.typography.h4.fontWeight),
    "--text-body-size": theme.typography.body.fontSize,
    "--text-body-line": theme.typography.body.lineHeight,
    "--text-body-weight": String(theme.typography.body.fontWeight),
    "--text-small-size": theme.typography.small.fontSize,
    "--text-small-line": theme.typography.small.lineHeight,
    "--text-small-weight": String(theme.typography.small.fontWeight),
    "--text-caption-size": theme.typography.caption.fontSize,
    "--text-caption-line": theme.typography.caption.lineHeight,
    "--text-caption-weight": String(theme.typography.caption.fontWeight),
  };

  if (theme.typography.h1.letterSpacing) vars["--text-h1-spacing"] = theme.typography.h1.letterSpacing;
  if (theme.typography.h2.letterSpacing) vars["--text-h2-spacing"] = theme.typography.h2.letterSpacing;
  if (theme.typography.body.letterSpacing) vars["--text-body-spacing"] = theme.typography.body.letterSpacing;

  return vars;
}

/**
 * Converts a Record<string, string> of CSS variables to React.CSSProperties.
 */
export function cssVarsToInlineStyle(vars: Record<string, string>): React.CSSProperties {
  return vars as unknown as React.CSSProperties;
}
