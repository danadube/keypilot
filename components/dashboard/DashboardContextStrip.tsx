import { cn } from "@/lib/utils";

export type DashboardContextStripProps = {
  title: string;
  subtitle: string;
  className?: string;
};

/**
 * Compact module context below the shell header: small title + one muted line.
 * 8px spacing system; keep subtle — not a hero or marketing block.
 */
export function DashboardContextStrip({
  title,
  subtitle,
  className,
}: DashboardContextStripProps) {
  return (
    <div
      className={cn(
        "border-b border-kp-outline/45 bg-kp-surface-high/25 py-2",
        className
      )}
      role="region"
      aria-label={title}
    >
      <p className="text-sm font-semibold leading-snug text-kp-on-surface">{title}</p>
      <p className="mt-2 text-xs leading-snug text-kp-on-surface/80">{subtitle}</p>
    </div>
  );
}
