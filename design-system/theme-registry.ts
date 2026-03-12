import type { BrandKey, BrandTheme } from "./tokens";
import { keypilotTheme } from "./brands/keypilot";
import { danadubeTheme } from "./brands/danadube";
import { glaabTheme } from "./brands/glaab";
import { siuTheme } from "./brands/siu";

export const themes: Record<BrandKey, BrandTheme> = {
  keypilot: keypilotTheme,
  danadube: danadubeTheme,
  glaab: glaabTheme,
  siu: siuTheme,
};

export const defaultBrandKey: BrandKey = "keypilot";

export function getThemeByKey(key: BrandKey): BrandTheme {
  return themes[key] ?? themes[defaultBrandKey];
}

export function isBrandKey(value: string): value is BrandKey {
  return value === "keypilot" || value === "danadube" || value === "glaab" || value === "siu";
}
