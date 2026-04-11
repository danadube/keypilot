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
      className="border-b border-kp-outline/20 pb-3 pt-0.5"
      aria-labelledby="showinghq-today-rail-heading"
    >
      <h2
        id="showinghq-today-rail-heading"
        className="mb-2 text-xs font-medium text-kp-on-surface-muted"
      >
        Today
      </h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[10px] text-kp-on-surface-muted">{c.label}</p>
            <p className="text-sm font-medium tabular-nums text-kp-on-surface">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
