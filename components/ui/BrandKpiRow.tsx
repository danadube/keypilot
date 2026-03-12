"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandKpiRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const gridCols: Record<2 | 3 | 4, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

export function BrandKpiRow({ children, columns = 4, className }: BrandKpiRowProps) {
  return (
    <div className={cn("grid gap-[var(--space-md)]", gridCols[columns], className)}>
      {children}
    </div>
  );
}
