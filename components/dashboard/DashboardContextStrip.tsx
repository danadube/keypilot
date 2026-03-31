import { cn } from "@/lib/utils";

export type DashboardContextStripProps = {
  /**
   * Optional eyebrow (e.g. Today, Snapshot). The shell header already shows the
   * module/page name — do not repeat it here.
   */
  label?: string;
  /** One short operational summary line (or two brief sentences). */
  message: string;
  className?: string;
  /** Defaults to label + message when both exist, else message. */
  ariaLabel?: string;
};

/**
 * Operational context below the shell header — not a second title row.
 * Tight 8px rhythm; subtle surface; dark KeyPilot tokens.
 */
export function DashboardContextStrip({
  label,
  message,
  className,
  ariaLabel,
}: DashboardContextStripProps) {
  const regionLabel =
    ariaLabel ?? (label ? `${label}: ${message}` : message);

  return (
    <div
      className={cn(
        "border-b border-kp-outline/45 bg-kp-surface-high/25 py-2",
        className
      )}
      role="region"
      aria-label={regionLabel}
    >
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface/60">
          {label}
        </p>
      ) : null}
      <p
        className={cn(
          "text-xs leading-snug text-kp-on-surface/85",
          label ? "mt-2" : null
        )}
      >
        {message}
      </p>
    </div>
  );
}
