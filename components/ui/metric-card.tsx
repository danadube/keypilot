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
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-xl border border-kp-outline bg-kp-surface px-5 py-4",
        className
      )}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-kp-on-surface-muted">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 font-headline text-[2rem] font-semibold leading-none tabular-nums",
            accent === "gold" && "text-kp-gold",
            accent === "teal" && "text-kp-teal",
            accent === "default" && "text-kp-on-surface"
          )}
        >
          {value}
        </p>
        {sub && (
          <p className="mt-1.5 text-xs text-kp-on-surface-variant">{sub}</p>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
