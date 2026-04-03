/**
 * Compact right-rail glance for ShowingHQ home — mirrors key counts without duplicating queue detail.
 */
export function ShowingHqTodayRailCard({
  showingsToday,
  openHousesToday,
  draftsWaiting,
  awaitingResponse,
}: {
  showingsToday: number;
  openHousesToday: number;
  draftsWaiting: number;
  awaitingResponse: number;
}) {
  const cells = [
    { label: "Showings today", value: showingsToday },
    { label: "Open houses today", value: openHousesToday },
    { label: "Drafts waiting", value: draftsWaiting },
    { label: "Awaiting response", value: awaitingResponse },
  ] as const;

  return (
    <section
      className="rounded-xl border border-kp-outline bg-kp-surface p-4"
      aria-labelledby="showinghq-today-rail-heading"
    >
      <h2
        id="showinghq-today-rail-heading"
        className="mb-3 text-sm font-semibold text-kp-on-surface"
      >
        Today
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-xs text-kp-on-surface-muted">{c.label}</p>
            <p className="text-base font-semibold tabular-nums text-kp-on-surface">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
