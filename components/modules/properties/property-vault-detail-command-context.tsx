"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PropertyVaultDetailCommands = {
  propertyId: string;
  onEdit: () => void;
  onAddTask: () => void;
  onArchive: () => void;
  onDelete: () => void;
  lifecycleBusy: "archive" | "delete" | null;
};

type Ctx = {
  detail: PropertyVaultDetailCommands | null;
  setDetail: (v: PropertyVaultDetailCommands | null) => void;
};

const PropertyVaultDetailCommandContext = createContext<Ctx | null>(null);

export function PropertyVaultDetailCommandProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<PropertyVaultDetailCommands | null>(null);
  const value = useMemo(() => ({ detail, setDetail }), [detail]);
  return (
    <PropertyVaultDetailCommandContext.Provider value={value}>{children}</PropertyVaultDetailCommandContext.Provider>
  );
}

export function usePropertyVaultDetailCommandApi() {
  const ctx = useContext(PropertyVaultDetailCommandContext);
  if (!ctx) {
    throw new Error("usePropertyVaultDetailCommandApi must be used within PropertyVaultDetailCommandProvider");
  }
  return ctx;
}
