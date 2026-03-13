"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { hasCrmAccess } from "@/lib/product-tier";

type ProductTier = "OPEN_HOUSE" | "FULL_CRM" | null;

type ProductTierContextValue = {
  productTier: ProductTier;
  hasCrm: boolean;
  isLoading: boolean;
};

const ProductTierContext = createContext<ProductTierContextValue>({
  productTier: null,
  hasCrm: false,
  isLoading: true,
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/me")
      .then((res) => res.json())
      .then((json) => {
        const tier = json.data?.productTier ?? "OPEN_HOUSE";
        setProductTier(tier);
      })
      .catch(() => setProductTier("OPEN_HOUSE"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <ProductTierContext.Provider
      value={{
        productTier,
        hasCrm: hasCrmAccess(productTier),
        isLoading,
      }}
    >
      {children}
    </ProductTierContext.Provider>
  );
}
