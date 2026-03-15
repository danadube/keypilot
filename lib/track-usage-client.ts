/**
 * Client-side usage event tracking. POSTs to /api/v1/analytics/track.
 * Fire-and-forget; does not block UI.
 */

import type { UsageEventName, UsageEventMetadata } from "./track-usage";

export function trackEvent(
  eventName: UsageEventName,
  metadata?: UsageEventMetadata
): void {
  if (typeof window === "undefined") return;
  fetch("/api/v1/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, metadata: metadata ?? {} }),
    keepalive: true,
  }).catch(() => {});
}
