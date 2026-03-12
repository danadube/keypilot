"use client";

import { useBrandContext } from "./brand-context";

/**
 * Client hook to access the current brand and theme.
 * Must be used within a BrandProvider.
 */
export function useBrand() {
  return useBrandContext();
}
