function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Compact timestamps for activity feeds: emphasizes today / yesterday when relevant.
 */
export function formatFeedActivityTimestamp(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const todayStart = startOfLocalDay(now);
  const dStart = startOfLocalDay(d);
  const diffDays = Math.round(
    (todayStart.getTime() - dStart.getTime()) / 86_400_000
  );

  const timePart = d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today · ${timePart}`;
  if (diffDays === 1) return `Yesterday · ${timePart}`;
  if (diffDays === -1) return `Tomorrow · ${timePart}`;

  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (d.getFullYear() !== now.getFullYear()) {
    opts.year = "numeric";
  }
  return d.toLocaleString("en-US", opts);
}
