"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CalendarLayerVisibility,
  type InternalLayerId,
  DEFAULT_LAYER_VISIBILITY,
  googleLayerKey,
  allLayersOn,
} from "@/lib/calendar/calendar-layer-visibility";

export type DisplayContextGoogleAccount = {
  connectionId: string;
  accountEmail: string | null;
  fetchError: string | null;
  calendars: Array<{ id: string; summary: string; primary: boolean; selected: boolean }>;
};

function LayerRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  accentClassName,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  accentClassName?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-1.5 py-1.5 transition-colors hover:bg-kp-surface-high/25"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-kp-outline text-kp-teal focus:ring-kp-teal/40"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {accentClassName ? (
            <span className={cn("h-2 w-2 shrink-0 rounded-sm", accentClassName)} aria-hidden />
          ) : null}
          <span className="text-[12px] font-medium leading-tight text-kp-on-surface">{label}</span>
        </span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-snug text-kp-on-surface-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

const INTERNAL: { id: InternalLayerId; label: string; hint: string; dot: string }[] = [
  { id: "showing", label: "Showings", hint: "Private appointments (ShowingHQ)", dot: "bg-[#14b8a6]" },
  { id: "task", label: "Tasks", hint: "Task Pilot", dot: "bg-amber-500" },
  { id: "follow_up", label: "Follow-ups", hint: "CRM follow-up work", dot: "bg-sky-500" },
  { id: "transaction", label: "Deals", hint: "Transactions & closings", dot: "bg-amber-700" },
];

type CalendarLeftRailProps = {
  className?: string;
  visibility: CalendarLayerVisibility;
  onVisibilityChange: (next: CalendarLayerVisibility) => void;
  googleAccounts: DisplayContextGoogleAccount[];
  googleKeys: { connectionId: string; calendarId: string }[];
};

export function CalendarLeftRail({
  className,
  visibility,
  onVisibilityChange,
  googleAccounts,
  googleKeys,
}: CalendarLeftRailProps) {
  const setInternal = (id: InternalLayerId, on: boolean) => {
    onVisibilityChange({ ...visibility, [id]: on });
  };

  const setGoogle = (connectionId: string, calendarId: string, on: boolean) => {
    const k = googleLayerKey(connectionId, calendarId);
    onVisibilityChange({
      ...visibility,
      googleCalendar: { ...visibility.googleCalendar, [k]: on },
    });
  };

  const setHolidays = (on: boolean) => {
    onVisibilityChange({ ...visibility, usHolidays: on });
  };

  const showAll = () => {
    const next: CalendarLayerVisibility = {
      ...DEFAULT_LAYER_VISIBILITY,
      googleCalendar: Object.fromEntries(googleKeys.map((gk) => [googleLayerKey(gk.connectionId, gk.calendarId), true])),
    };
    onVisibilityChange(next);
  };

  const allOn = allLayersOn(visibility, googleKeys);

  return (
    <aside
      className={cn(
        "flex w-full flex-col rounded-xl border border-kp-outline/80 bg-kp-surface-high/[0.05] shadow-sm",
        "lg:max-h-[min(85vh,calc(100vh-10rem))] lg:w-[12.75rem] xl:w-[13.25rem] lg:shrink-0 lg:overflow-y-auto",
        className
      )}
    >
      <div className="border-b border-kp-outline/60 px-2 py-2 sm:px-2.5">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 shrink-0 text-kp-teal" aria-hidden />
          <p className="font-headline text-[13px] font-semibold leading-tight text-kp-on-surface">Calendars</p>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-kp-on-surface-muted">
          Layers for week and month views.
        </p>
        <button
          type="button"
          disabled={allOn}
          onClick={showAll}
          className={cn(
            "mt-2 text-[11px] font-semibold text-kp-teal underline-offset-2 hover:underline",
            allOn && "cursor-not-allowed opacity-40 hover:no-underline"
          )}
        >
          Show all layers
        </button>
      </div>

      <div className="space-y-4 px-2 py-3">
        <section>
          <h3 className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
            My calendars
          </h3>
          <div className="space-y-0.5">
            {INTERNAL.map((row) => (
              <LayerRow
                key={row.id}
                id={`layer-${row.id}`}
                label={row.label}
                description={row.hint}
                accentClassName={row.dot}
                checked={visibility[row.id]}
                onCheckedChange={(v) => setInternal(row.id, v)}
              />
            ))}
          </div>
        </section>

        <section>
          <h3 className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
            Google calendars
          </h3>
          {googleAccounts.length === 0 ? (
            <p className="px-1.5 text-[12px] leading-snug text-kp-on-surface-muted">
              Connect Google under{" "}
              <Link href="/settings/connections" className="font-medium text-kp-teal hover:underline">
                Settings → Connections
              </Link>{" "}
              to layer read-only Google events here.
            </p>
          ) : (
            <div className="space-y-3">
              {googleAccounts.map((acct) => (
                <div key={acct.connectionId}>
                  <p className="truncate px-1.5 text-[11px] font-semibold text-kp-on-surface">
                    {acct.accountEmail ?? "Google account"}
                  </p>
                  {acct.fetchError ? (
                    <div className="mt-1.5 space-y-1.5 rounded-md border border-amber-500/35 bg-amber-500/[0.07] px-2 py-1.5">
                      <p className="text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/95">
                        {acct.fetchError}
                      </p>
                      <Link
                        href="/settings/connections"
                        className="inline-flex text-[10px] font-semibold text-kp-teal hover:underline"
                      >
                        Open Connections
                      </Link>
                    </div>
                  ) : null}
                  {acct.calendars.length === 0 && !acct.fetchError ? (
                    <p className="mt-1 px-1.5 text-[11px] text-kp-on-surface-muted">No calendars selected for sync.</p>
                  ) : (
                    <div className="mt-1 space-y-0.5">
                      {acct.calendars.map((cal) => {
                        const cid = `gcal-${acct.connectionId}-${cal.id}`;
                        return (
                          <LayerRow
                            key={cid}
                            id={cid}
                            label={cal.summary}
                            description={cal.primary ? "Primary · read-only in KeyPilot" : "Read-only in KeyPilot"}
                            accentClassName="bg-slate-400"
                            checked={
                              visibility.googleCalendar[googleLayerKey(acct.connectionId, cal.id)] !== false
                            }
                            onCheckedChange={(v) => setGoogle(acct.connectionId, cal.id, v)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="px-1.5 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
            Other calendars
          </h3>
          <LayerRow
            id="layer-us-holidays"
            label="US Holidays"
            description="US federal holidays (built-in)"
            accentClassName="bg-rose-400"
            checked={visibility.usHolidays}
            onCheckedChange={setHolidays}
          />
        </section>
      </div>

      <div className="mt-auto border-t border-kp-outline/55 px-2 py-2 sm:px-2.5">
        <Link
          href="/settings/connections"
          className="text-[11px] font-medium text-kp-teal/90 underline-offset-2 hover:text-kp-teal hover:underline"
        >
          Calendar &amp; email settings
        </Link>
      </div>
    </aside>
  );
}
