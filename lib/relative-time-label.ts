/**
 * Returns a compact, human-readable time context for events (showings, open houses).
 * Used in Command Center and anywhere we need "starts in X min" / "started X min ago" / "ended X min ago".
 */
export function getRelativeTimeLabel(
  startAt: Date | string,
  endAt?: Date | string | null
): string {
  const start = typeof startAt === "string" ? new Date(startAt) : startAt;
  const end = endAt != null ? (typeof endAt === "string" ? new Date(endAt) : endAt) : null;
  const now = new Date();

  if (now < start) {
    const mins = Math.round((start.getTime() - now.getTime()) / 60000);
    if (mins <= 0) return "starting now";
    if (mins < 60) return `starts in ${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    if (hours < 24 && remainder === 0) return `starts in ${hours}h`;
    if (hours < 24) return `starts in ${hours}h ${remainder}m`;
    return `starts ${start.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  }

  if (end && now >= end) {
    const mins = Math.round((now.getTime() - end.getTime()) / 60000);
    if (mins <= 0) return "just ended";
    if (mins < 60) return `ended ${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `ended ${hours}h ago`;
    return "ended earlier";
  }

  // Started but not ended (in progress)
  const mins = Math.round((now.getTime() - start.getTime()) / 60000);
  if (mins <= 0) return "started just now";
  if (mins < 60) return `started ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  if (hours < 24 && remainder === 0) return `started ${hours}h ago`;
  if (hours < 24) return `started ${hours}h ${remainder}m ago`;
  return "in progress";
}
