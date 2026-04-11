import { cn } from "@/lib/utils";

type MetricCardAccent = "gold" | "teal" | "default";

interface MetricCardProps {
  label: string;
  value: string | number;
  /** Optional supporting line below the value */
  sub?: string;
  /** Optional rendered in the bottom-right of the card */
  action?: React.ReactNode;
  accent?: MetricCardAccent;
  /** Lighter, smaller treatment — e.g. list page KPI rows where the table is primary. Still uses `accent` for value color. */
  variant?: "default" | "compact";
  className?: string;
}

/**
 * Dark-surface metric card for the KeyPilot design system.
 *
 * Uses kp-* Tailwind tokens. Intended for use inside dark (kp-bg) containers.
 *
 * @example
 * <MetricCard label="Total properties" value={12} accent="gold" />
 * <MetricCard label="Open houses linked" value={34} accent="teal" />
 */
export function MetricCard({
  label,
  value,
  sub,
  action,
  accent = "default",
  variant = "default",
  className,
}: MetricCardProps) {
  const compact = variant === "compact";
  const valueAccentClass =
    accent === "gold"
      ? "text-kp-gold"
      : accent === "teal"
        ? "text-kp-teal"
        : "text-kp-on-surface";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between",
        compact
          ? "rounded-lg border border-kp-outline/45 bg-kp-surface-high/[0.22] px-3 py-2"
          : "rounded-xl border border-kp-outline bg-kp-surface px-5 py-4",
        className
      )}
    >
      <div>
        <p
          className={cn(
            "text-kp-on-surface-muted",
            compact
              ? "text-[10px] font-medium tracking-wide"
              : "text-[11px] font-semibold uppercase tracking-widest"
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "font-semibold tabular-nums leading-none",
            compact
              ? cn("mt-1 text-base", valueAccentClass)
              : cn("mt-2 font-headline text-[2rem]", valueAccentClass)
          )}
        >
          {value}
        </p>
        {sub && (
          <p className={cn("text-kp-on-surface-variant", compact ? "mt-0.5 text-[11px]" : "mt-1.5 text-xs")}>
            {sub}
          </p>
        )}
      </div>
      {action && <div className={compact ? "mt-2" : "mt-3"}>{action}</div>}
    </div>
  );
}
