"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Renders only after mount so server HTML and the first client pass match (local clock + timezone).
 */
function CommandCenterLiveTitleInner() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { dateLine, timeLine } = useMemo(() => {
    const dateLine = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeLine = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return { dateLine, timeLine };
  }, [now]);

  return (
    <div className="space-y-0.5">
      <h1 className="font-headline text-lg font-semibold leading-snug tracking-tight text-kp-on-surface md:text-xl">
        {dateLine}
      </h1>
      <p
        className="text-base font-medium tabular-nums tracking-tight text-kp-on-surface-variant md:text-lg"
        aria-label={`Current time ${timeLine}`}
      >
        {timeLine}
      </p>
    </div>
  );
}

/**
 * Live-updating dashboard heading: full date on one line, clock on the next.
 */
export function CommandCenterLiveTitle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-0.5" aria-hidden>
        <div className="h-[1.75rem] max-w-[18rem] animate-pulse rounded-md bg-kp-surface-high/35 md:h-[2rem]" />
        <div className="h-6 max-w-[6rem] animate-pulse rounded-md bg-kp-surface-high/30 md:h-7" />
      </div>
    );
  }

  return <CommandCenterLiveTitleInner />;
}
