"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { hasCrmAccess } from "@/lib/product-tier";
import {
  hasModuleAccess as checkModuleAccess,
  type ModuleAccessMap,
} from "@/lib/module-access";
import type { ModuleId } from "@/lib/modules";

type ProductTier = "OPEN_HOUSE" | "FULL_CRM" | null;

type ProductTierContextValue = {
  productTier: ProductTier;
  hasCrm: boolean;
  isLoading: boolean;
  moduleAccess: ModuleAccessMap | null;
  hasModuleAccess: (moduleId: ModuleId) => boolean;
};

const ProductTierContext = createContext<ProductTierContextValue>({
  productTier: null,
  hasCrm: false,
  isLoading: true,
  moduleAccess: null,
  hasModuleAccess: () => false,
});

export function useProductTier() {
  const ctx = useContext(ProductTierContext);
  if (!ctx) {
    throw new Error("useProductTier must be used within ProductTierProvider");
  }
  return ctx;
}

export function ProductTierProvider({ children }: { children: React.ReactNode }) {
  const [productTier, setProductTier] = useState<ProductTier>(null);
  const [moduleAccess, setModuleAccess] =
    useState<ModuleAccessMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/me")
      .then((res) => res.json())
      .then((json) => {
        const tier = json.data?.productTier ?? "OPEN_HOUSE";
        setProductTier(tier);
        setModuleAccess(json.data?.moduleAccess ?? null);
      })
      .catch(() => {
        setProductTier("OPEN_HOUSE");
        setModuleAccess(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ProductTierContext.Provider
      value={{
        productTier,
        hasCrm: hasCrmAccess(productTier),
        isLoading,
        moduleAccess,
        hasModuleAccess: (moduleId: ModuleId) =>
          checkModuleAccess(moduleAccess, moduleId),
      }}
    >
      {children}
    </ProductTierContext.Provider>
  );
}
