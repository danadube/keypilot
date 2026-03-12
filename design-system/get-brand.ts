import type { BrandKey, BrandTheme } from "./tokens";
import { getThemeByKey, defaultBrandKey, isBrandKey } from "./theme-registry";

/**
 * Server-safe helper to get a theme by brand key.
 * Falls back to default brand if key is invalid or missing.
 */
export function getTheme(brandKey?: string | null): BrandTheme {
  if (!brandKey || !isBrandKey(brandKey)) {
    return getThemeByKey(defaultBrandKey);
  }
  return getThemeByKey(brandKey);
}
