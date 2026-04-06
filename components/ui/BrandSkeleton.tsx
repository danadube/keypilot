import { cn } from "@/lib/utils";

/**
 * BrandSkeleton — animated shimmer placeholder for loading states.
 * Uses KeyPilot dark surface tokens so it looks native in the dashboard.
 */
export function BrandSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-kp-surface-high",
        className
      )}
      {...props}
    />
  );
}
