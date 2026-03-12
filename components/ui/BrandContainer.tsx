"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BrandContainerSize = "sm" | "md" | "lg" | "xl";
type BrandContainerPadding = "default" | "section" | "page";

const maxWidthClasses: Record<BrandContainerSize, string> = {
  sm: "max-w-[640px]",
  md: "max-w-[768px]",
  lg: "max-w-[1024px]",
  xl: "max-w-[1280px]",
};

const paddingClasses: Record<BrandContainerPadding, string> = {
  default: "px-[var(--space-md)]",
  section: "px-[var(--space-2xl)]",
  page: "px-[var(--space-3xl)]",
};

export interface BrandContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  size?: BrandContainerSize;
  padding?: BrandContainerPadding;
}

export const BrandContainer = React.forwardRef<
  HTMLDivElement,
  BrandContainerProps
>(({ className, size = "lg", padding = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mx-auto w-full", maxWidthClasses[size], paddingClasses[padding], className)}
      {...props}
    />
  );
});
BrandContainer.displayName = "BrandContainer";
