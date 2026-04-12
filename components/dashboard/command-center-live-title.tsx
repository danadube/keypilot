"use client";

import { useEffect, useMemo, useState } from "react";

function formatLiveHeading(d: Date) {
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `Today — ${weekday}, ${monthDay} · ${time}`;
}

/**
 * Live-updating dashboard heading (clock refreshes on an interval).
 */
export function CommandCenterLiveTitle() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const line = useMemo(() => formatLiveHeading(now), [now]);

  return (
    <h1 className="font-headline text-lg font-semibold leading-snug tracking-tight text-kp-on-surface md:text-xl">
      {line}
    </h1>
  );
}
