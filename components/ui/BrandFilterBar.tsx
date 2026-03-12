import * as React from "react";
import { cn } from "@/lib/utils";

export function BrandFilterBar({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-[var(--space-sm)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
