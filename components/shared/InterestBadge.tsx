"use client";

const LABELS: Record<string, string> = {
  VERY_INTERESTED: "🔥 Very interested",
  MAYBE_INTERESTED: "🙂 Maybe",
  JUST_BROWSING: "👀 Browsing",
};

type InterestBadgeProps = {
  interestLevel: string | null | undefined;
  className?: string;
};

export function InterestBadge({ interestLevel, className }: InterestBadgeProps) {
  if (!interestLevel) return <span className="text-[var(--brand-text-muted)]">—</span>;
  const label = LABELS[interestLevel] ?? interestLevel;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}
      style={{
        ...(interestLevel === "VERY_INTERESTED" && {
          backgroundColor: "rgb(251 113 133 / 0.15)",
          borderColor: "rgb(251 113 133 / 0.4)",
          color: "rgb(185 28 28)",
        }),
        ...(interestLevel === "MAYBE_INTERESTED" && {
          backgroundColor: "rgb(251 191 36 / 0.15)",
          borderColor: "rgb(251 191 36 / 0.4)",
          color: "rgb(161 98 7)",
        }),
        ...(interestLevel === "JUST_BROWSING" && {
          backgroundColor: "rgb(148 163 184 / 0.15)",
          borderColor: "rgb(148 163 184 / 0.4)",
          color: "rgb(71 85 105)",
        }),
      }}
    >
      {label}
    </span>
  );
}
