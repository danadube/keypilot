import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
  {
    variants: {
      variant: {
        // Interaction / active states — teal
        active:   "bg-kp-teal/10 text-kp-teal border border-kp-teal/25",
        live:     "bg-kp-teal/15 text-kp-teal border border-kp-teal/40",
        // In-progress / pending — gold
        pending:  "bg-kp-gold/10 text-kp-gold border border-kp-gold/25",
        upcoming: "bg-kp-gold/10 text-kp-gold-bright border border-kp-gold/20",
        // Neutral / off states
        inactive: "bg-kp-outline/40 text-kp-on-surface-variant border border-kp-outline",
        draft:    "bg-kp-surface-high text-kp-on-surface-variant border border-kp-outline",
        // Completed / positive
        sold:     "bg-emerald-950 text-emerald-400 border border-emerald-800/60",
        closed:   "bg-emerald-950 text-emerald-400 border border-emerald-800/60",
        // Destructive
        cancelled: "bg-red-950 text-red-400 border border-red-800/60",
      },
    },
    defaultVariants: {
      variant: "inactive",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode;
  /** Optional leading dot indicator */
  dot?: boolean;
  className?: string;
}

/**
 * Status badge for the KeyPilot dark design system.
 *
 * @example
 * <StatusBadge variant="active">Active</StatusBadge>
 * <StatusBadge variant="pending" dot>Pending</StatusBadge>
 * <StatusBadge variant="sold">Sold</StatusBadge>
 */
export function StatusBadge({ children, variant, dot, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ variant }), className)}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            variant === "active" || variant === "live"
              ? "bg-kp-teal"
              : variant === "pending" || variant === "upcoming"
              ? "bg-kp-gold"
              : variant === "sold" || variant === "closed"
              ? "bg-emerald-400"
              : variant === "cancelled"
              ? "bg-red-400"
              : "bg-kp-on-surface-variant"
          )}
        />
      )}
      {children}
    </span>
  );
}
