"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { BrandKey, BrandTheme } from "./tokens";
import { defaultBrandKey, getThemeByKey } from "./theme-registry";
import { themeToCssVars, cssVarsToInlineStyle } from "./css-vars";

interface BrandContextValue {
  brand: BrandKey;
  theme: BrandTheme;
}

const BrandContext = createContext<BrandContextValue | null>(null);

export interface BrandProviderProps {
  brand?: BrandKey;
  children: React.ReactNode;
}

export function BrandProvider({ brand = defaultBrandKey, children }: BrandProviderProps) {
  const theme = getThemeByKey(brand);
  const cssVars = useMemo(() => themeToCssVars(theme), [theme]);
  const style = useMemo(() => cssVarsToInlineStyle(cssVars), [cssVars]);

  const value = useMemo<BrandContextValue>(
    () => ({ brand, theme }),
    [brand, theme]
  );

  return (
    <BrandContext.Provider value={value}>
      <div
        style={{
          ...style,
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          fontFamily: "var(--font-body)",
          minHeight: "100vh",
          width: "100%",
        }}
        className="design-system-root"
      >
        {children}
      </div>
    </BrandContext.Provider>
  );
}

export function useBrandContext(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error(
      "useBrand must be used within a BrandProvider. Wrap your app or component with <BrandProvider brand=\"keypilot\">."
    );
  }
  return ctx;
}
