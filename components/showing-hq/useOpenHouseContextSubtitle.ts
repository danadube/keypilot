"use client";

import { useEffect, useState } from "react";

/**
 * Loads a short property line for ShowingHQ open-house tool chrome (API shape matches GET open-houses/:id).
 */
export function useOpenHouseContextSubtitle(openHouseId: string): string | null {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || json.error || !json.data) return;
        const p = json.data.property as
          | { address1?: string; city?: string }
          | undefined;
        const title = json.data.title as string | undefined;
        const parts = [p?.address1, p?.city].filter(Boolean) as string[];
        setLine(parts.length > 0 ? parts.join(", ") : title ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [openHouseId]);

  return line;
}
