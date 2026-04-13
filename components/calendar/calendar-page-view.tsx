"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  PageHeader,
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenuSeparator,
  PageHeaderPrimaryAddMenu,
} from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { apiFetcher } from "@/lib/fetcher";
import type { CalendarEvent } from "@/lib/calendar/calendar-event-types";
import {
  CalendarWeekView,
  type CalendarWeekEmptyHint,
} from "@/components/calendar/calendar-week-view";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import {
  AddEventModal,
  FollowUpCalendarHintModal,
  formatCalendarQuickAddSummary,
  type CalendarQuickAddPrefill,
} from "@/components/calendar/add-event-modal";
import { CalendarDayAgendaModal } from "@/components/calendar/calendar-day-agenda-modal";
import { ExternalCalendarEventDetailModal } from "@/components/calendar/external-calendar-event-detail-modal";
import { HolidayEventDetailModal } from "@/components/calendar/holiday-event-detail-modal";
import {
  CalendarLeftRail,
  type DisplayContextGoogleAccount,
} from "@/components/calendar/calendar-left-rail";
import {
  allLayersOn,
  applyLayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  loadLayerVisibilityFromStorage,
  saveLayerVisibilityToStorage,
  type CalendarLayerVisibility,
} from "@/lib/calendar/calendar-layer-visibility";
import {
  buildEventsByDayMapForMonth,
  filterEventsForLocalDay,
  MONTH_CELL_SOURCE_ACCENT,
  parseLocalDateKeyToNoon,
  sortAgendaDayEvents,
} from "@/lib/calendar/calendar-event-day-utils";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekSunday(d: Date): Date {
  const s = startOfLocalDay(d);
  const dow = s.getDay();
  s.setDate(s.getDate() - dow);
  return s;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ViewMode = "week" | "month";

const NO_EVENTS: CalendarEvent[] = [];

function CalendarMonthOverview({
  visibleMonth,
  events,
  onDayClick,
  activeWeekStart,
  selectedDayKey,
}: {
  visibleMonth: Date;
  events: CalendarEvent[];
  /** Opens day agenda for this local date (parent also syncs week/month navigation). */
  onDayClick: (d: Date) => void;
  activeWeekStart: Date;
  /** Highlights the day whose agenda is open (month view). */
  selectedDayKey: string | null;
}) {
  const eventsByDay = useMemo(() => buildEventsByDayMapForMonth(events, visibleMonth), [events, visibleMonth]);

  const grid = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const last = addDays(addMonths(first, 1), -1);
    const cells: { date: Date | null }[] = [];
    const pad = first.getDay();
    for (let i = 0; i < pad; i++) cells.push({ date: null });
    for (let day = 1; day <= last.getDate(); day++) {
      cells.push({ date: new Date(first.getFullYear(), first.getMonth(), day) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [visibleMonth]);

  const title = visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekBandStart = startOfLocalDay(activeWeekStart);
  const weekBandEnd = addDays(weekBandStart, 7);

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface shadow-sm">
      <div className="border-b border-kp-outline/70 bg-kp-surface-high/[0.08] px-4 py-3">
        <p className="font-headline text-base font-semibold tracking-tight text-kp-on-surface">{title}</p>
        <p className="mt-1 text-xs leading-snug text-kp-on-surface-muted">
          Event titles preview in each cell. The teal band matches Week view. Click a day for the full agenda.
        </p>
      </div>
      <div className="p-3.5 sm:p-5">
        <div className="overflow-hidden rounded-lg border border-kp-outline/80 bg-kp-bg shadow-inner">
          <div className="grid grid-cols-7 border-b border-kp-outline/70 bg-kp-surface-high/[0.12] text-center text-[10px] font-bold uppercase tracking-wide text-kp-on-surface-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w} className="border-l border-kp-outline/50 py-2.5 first:border-l-0 sm:py-3">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              const colFirst = i % 7 === 0;
              if (cell.date == null) {
                return (
                  <div
                    key={`e-${i}`}
                    className={cn(
                      "min-h-[3.25rem] border-b border-l border-kp-outline/40 bg-kp-surface-high/[0.04]",
                      colFirst && "border-l-0"
                    )}
                  />
                );
              }
              const d = cell.date;
              const key = localDateKey(d);
              const dayList = eventsByDay.get(key) ?? [];
              const n = dayList.length;
              const preview = dayList.slice(0, 2);
              const overflow = Math.max(0, n - 2);
              const isToday = localDateKey(d) === localDateKey(new Date());
              const dayStart = startOfLocalDay(d);
              const inActiveWeek = dayStart >= weekBandStart && dayStart < weekBandEnd;
              const isAgendaSelected = selectedDayKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onDayClick(d);
                  }}
                  className={cn(
                    "relative flex min-h-[5rem] cursor-pointer flex-col items-stretch border-b border-l border-kp-outline/45 bg-kp-surface px-1.5 pb-1.5 pt-1.5 text-left transition-colors hover:z-[1] hover:bg-kp-surface-high/30 sm:min-h-[5.75rem]",
                    colFirst && "border-l-0",
                    inActiveWeek && "bg-kp-teal/[0.09]",
                    isToday && !inActiveWeek && "ring-1 ring-inset ring-kp-teal/40",
                    isToday && inActiveWeek && "ring-2 ring-inset ring-kp-teal/55",
                    isAgendaSelected && "ring-2 ring-inset ring-kp-teal/70"
                  )}
                >
                  <div className="flex shrink-0 justify-center">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums sm:h-7 sm:w-7 sm:text-xs",
                        isToday
                          ? "bg-kp-teal text-white shadow-md ring-2 ring-kp-teal/30"
                          : "text-kp-on-surface"
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="mt-1 min-h-0 w-full flex-1 space-y-0.5">
                    {preview.map((ev) => (
                      <div
                        key={ev.id}
                        className={cn(
                          "truncate border-l-[2.5px] pl-1 text-[8px] font-medium leading-snug text-kp-on-surface sm:text-[9px]",
                          MONTH_CELL_SOURCE_ACCENT[ev.sourceType] ?? MONTH_CELL_SOURCE_ACCENT.external
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {overflow > 0 ? (
                      <p className="pl-0.5 text-[8px] font-semibold tabular-nums text-kp-on-surface-muted sm:text-[9px]">
                        +{overflow} more
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarPageView() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeekSunday(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [layerVisibility, setLayerVisibility] = useState<CalendarLayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState<CalendarQuickAddPrefill | null>(null);
  const [followUpHintOpen, setFollowUpHintOpen] = useState(false);
  const [followUpHintSummary, setFollowUpHintSummary] = useState("");
  const [agendaDay, setAgendaDay] = useState<Date | null>(null);
  const [externalDetail, setExternalDetail] = useState<CalendarEvent | null>(null);
  const [holidayDetail, setHolidayDetail] = useState<CalendarEvent | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  /** When opening New task from the calendar (or after choosing Task in Add to Calendar), set due date/time. Cleared when the modal closes. */
  const [taskDuePrefill, setTaskDuePrefill] = useState<{ date: string; time: string } | null>(null);

  const range = useMemo(() => {
    if (view === "week") {
      const start = startOfLocalDay(weekStart);
      const end = addDays(start, 7);
      return { start, end };
    }
    const first = startOfMonth(visibleMonth);
    const end = addMonths(first, 1);
    return { start: first, end };
  }, [view, weekStart, visibleMonth]);

  const { data, isLoading, mutate } = useSWR<{
    events: CalendarEvent[];
    integrations?: {
      googleCalendarConnected: boolean;
      googleCalendarFetchError: string | null;
    };
  }>(
    `/api/v1/calendar/events?rangeStartIso=${encodeURIComponent(range.start.toISOString())}&rangeEndIso=${encodeURIComponent(range.end.toISOString())}`,
    apiFetcher
  );

  const { data: displayCtx } = useSWR<{ googleAccounts: DisplayContextGoogleAccount[] }>(
    "/api/v1/calendar/display-context",
    apiFetcher
  );

  useEffect(() => {
    setLayerVisibility(loadLayerVisibilityFromStorage());
  }, []);

  useEffect(() => {
    saveLayerVisibilityToStorage(layerVisibility);
  }, [layerVisibility]);

  const events = data?.events ?? NO_EVENTS;
  const integrations = data?.integrations;

  const googleKeys = useMemo(() => {
    const acc = displayCtx?.googleAccounts ?? [];
    const keys: { connectionId: string; calendarId: string }[] = [];
    for (const a of acc) {
      for (const c of a.calendars) {
        keys.push({ connectionId: a.connectionId, calendarId: c.id });
      }
    }
    return keys;
  }, [displayCtx]);

  const filtered = useMemo(
    () => applyLayerVisibility(events, layerVisibility, googleKeys),
    [events, layerVisibility, googleKeys]
  );

  const allLayersVisible = useMemo(
    () => allLayersOn(layerVisibility, googleKeys),
    [layerVisibility, googleKeys]
  );

  const agendaEventsForModal = useMemo(() => {
    if (!agendaDay) return [];
    return sortAgendaDayEvents(filterEventsForLocalDay(filtered, agendaDay));
  }, [filtered, agendaDay]);

  const weekLabel = useMemo(() => {
    const a = weekStart;
    const b = addDays(a, 6);
    const sameMonth = a.getMonth() === b.getMonth();
    const left = a.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const right = b.toLocaleDateString(undefined, {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${left} – ${right}`;
  }, [weekStart]);

  const goToday = useCallback(() => {
    const t = new Date();
    setWeekStart(startOfWeekSunday(t));
    setVisibleMonth(startOfMonth(t));
  }, []);

  const goPrevWeek = useCallback(() => {
    setWeekStart((w) => addDays(w, -7));
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((w) => addDays(w, 7));
  }, []);

  const openNewTaskWithPrefill = useCallback((prefill: { date: string; time: string } | null) => {
    setTaskDuePrefill(prefill);
    setNewTaskOpen(true);
  }, []);

  const onNewTaskOpenChange = useCallback((open: boolean) => {
    setNewTaskOpen(open);
    if (!open) setTaskDuePrefill(null);
  }, []);

  const openAddEventModal = useCallback((prefill: CalendarQuickAddPrefill) => {
    setQuickAddPrefill(prefill);
    setAddEventOpen(true);
  }, []);

  const onAddEventOpenChange = useCallback((open: boolean) => {
    setAddEventOpen(open);
    if (!open) setQuickAddPrefill(null);
  }, []);

  const onChooseShowingFromQuickAdd = useCallback(
    (prefill: CalendarQuickAddPrefill) => {
      onAddEventOpenChange(false);
      const qs = new URLSearchParams();
      qs.set("scheduledDate", prefill.date);
      if (prefill.time.trim()) qs.set("scheduledTime", prefill.time.trim());
      router.push(`/showing-hq/showings/new?${qs.toString()}`);
    },
    [onAddEventOpenChange, router]
  );

  const onChooseTaskFromQuickAdd = useCallback(
    (prefill: CalendarQuickAddPrefill) => {
      onAddEventOpenChange(false);
      openNewTaskWithPrefill(prefill);
    },
    [onAddEventOpenChange, openNewTaskWithPrefill]
  );

  const onChooseFollowUpFromQuickAdd = useCallback(
    (prefill: CalendarQuickAddPrefill) => {
      onAddEventOpenChange(false);
      setFollowUpHintSummary(formatCalendarQuickAddSummary(prefill));
      setFollowUpHintOpen(true);
    },
    [onAddEventOpenChange]
  );

  const onMonthDayOpenAgenda = useCallback((d: Date) => {
    setWeekStart(startOfWeekSunday(d));
    setVisibleMonth(startOfMonth(d));
    setAgendaDay(startOfLocalDay(d));
  }, []);

  const onWeekAllDayOpenAgenda = useCallback(({ dateKey }: { dateKey: string }) => {
    setAgendaDay(parseLocalDateKeyToNoon(dateKey));
  }, []);

  const weekEmptyHint: CalendarWeekEmptyHint = useMemo(() => {
    if (isLoading || view !== "week") return "none";
    if (events.length === 0) return "no-events";
    if (filtered.length === 0) return "filter-empty";
    return "none";
  }, [isLoading, view, events.length, filtered.length]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Calendar"
        subtitle="Pick layers on the left, navigate time in the header, and plan KeyPilot work with Google context."
        secondaryActions={
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 shrink-0 px-3 text-xs font-semibold")}
              onClick={goToday}
            >
              Today
            </Button>
            <div
              className="flex min-w-0 max-w-[min(100%,20rem)] items-center gap-0.5"
              aria-label={view === "week" ? "Week range" : "Month"}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface"
                onClick={view === "week" ? goPrevWeek : () => setVisibleMonth((m) => addMonths(m, -1))}
                aria-label={view === "week" ? "Previous week" : "Previous month"}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-0 flex-1 truncate px-0.5 text-center text-xs font-semibold tabular-nums text-kp-on-surface sm:text-sm">
                {view === "week" ? weekLabel : visibleMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface"
                onClick={view === "week" ? goNextWeek : () => setVisibleMonth((m) => addMonths(m, 1))}
                aria-label={view === "week" ? "Next week" : "Next month"}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div
              className="inline-flex shrink-0 rounded-lg border border-kp-outline/70 bg-kp-bg/80 p-0.5 shadow-sm"
              role="group"
              aria-label="Calendar view"
            >
              <button
                type="button"
                onClick={() => setView("week")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3",
                  view === "week"
                    ? "bg-kp-teal/20 text-kp-on-surface shadow-sm"
                    : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors sm:px-3",
                  view === "month"
                    ? "bg-kp-teal/20 text-kp-on-surface shadow-sm"
                    : "text-kp-on-surface-muted hover:text-kp-on-surface"
                )}
              >
                Month
              </button>
            </div>
          </div>
        }
        primaryAction={
          <PageHeaderPrimaryAddMenu summaryLabel="Quick add">
            <PageHeaderActionItem href="/showing-hq/showings/new">New showing</PageHeaderActionItem>
            <PageHeaderActionItem href="/open-houses/new">New open house</PageHeaderActionItem>
            <PageHeaderActionButton type="button" onClick={() => openNewTaskWithPrefill(null)}>
              New task
            </PageHeaderActionButton>
            <PageHeaderActionItem href="/showing-hq/follow-ups">Follow-up</PageHeaderActionItem>
            <PageHeaderActionItem href="/transactions?new=1">New transaction</PageHeaderActionItem>
            <PageHeaderActionsMenuSeparator />
            <PageHeaderActionItem href="/settings/connections">Calendar &amp; email</PageHeaderActionItem>
          </PageHeaderPrimaryAddMenu>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-3">
        <CalendarLeftRail
          visibility={layerVisibility}
          onVisibilityChange={setLayerVisibility}
          googleAccounts={displayCtx?.googleAccounts ?? []}
          googleKeys={googleKeys}
        />

        <div className="min-w-0 flex-1 space-y-4">
          {integrations && !integrations.googleCalendarConnected ? (
            <p className="text-center text-[11px] leading-snug text-kp-on-surface-muted lg:text-left">
              <Link
                href="/settings/connections"
                className="font-medium text-kp-teal/90 underline-offset-2 hover:text-kp-teal hover:underline"
              >
                Connect Google Calendar
              </Link>{" "}
              to layer read-only Google events (configure calendars in Connections).
            </p>
          ) : null}
          {integrations?.googleCalendarConnected && integrations.googleCalendarFetchError ? (
            <p
              className="text-center text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90 lg:text-left"
              role="status"
            >
              Google Calendar could not be loaded; showing KeyPilot and built-in layers only. Reconnect under{" "}
              <Link href="/settings/connections" className="font-medium underline-offset-2 hover:underline">
                Settings → Connections
              </Link>
              .
            </p>
          ) : null}

          {isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-kp-surface-high/30" aria-busy aria-label="Loading calendar" />
          ) : view === "week" ? (
            <div className="rounded-xl border border-kp-outline/90 bg-kp-surface p-0.5 shadow-md sm:p-1.5 md:p-2">
              <CalendarWeekView
                weekStart={weekStart}
                events={filtered}
                emptyHint={weekEmptyHint}
                onTimeGridCreate={({ dateKey, timeLocal }) =>
                  openAddEventModal({ date: dateKey, time: timeLocal })
                }
                onAllDayBackgroundClick={onWeekAllDayOpenAgenda}
                onExternalEventOpen={setExternalDetail}
                onHolidayEventOpen={setHolidayDetail}
              />
            </div>
          ) : view === "month" ? (
            <CalendarMonthOverview
              visibleMonth={visibleMonth}
              events={filtered}
              onDayClick={onMonthDayOpenAgenda}
              activeWeekStart={weekStart}
              selectedDayKey={agendaDay && view === "month" ? localDateKey(agendaDay) : null}
            />
          ) : null}
        </div>
      </div>

      <CalendarDayAgendaModal
        open={agendaDay != null}
        onOpenChange={(o) => {
          if (!o) setAgendaDay(null);
        }}
        day={agendaDay}
        events={agendaEventsForModal}
        allLayersVisible={allLayersVisible}
        onAdd={(prefill) => openAddEventModal(prefill)}
        onExternalSelect={(ev) => {
          setAgendaDay(null);
          setExternalDetail(ev);
        }}
        onHolidaySelect={(ev) => {
          setAgendaDay(null);
          setHolidayDetail(ev);
        }}
      />

      <ExternalCalendarEventDetailModal
        ev={externalDetail}
        open={externalDetail != null}
        onOpenChange={(o) => {
          if (!o) setExternalDetail(null);
        }}
      />

      <HolidayEventDetailModal
        ev={holidayDetail}
        open={holidayDetail != null}
        onOpenChange={(o) => {
          if (!o) setHolidayDetail(null);
        }}
      />

      <AddEventModal
        open={addEventOpen}
        onOpenChange={onAddEventOpenChange}
        prefill={quickAddPrefill}
        onChooseShowing={onChooseShowingFromQuickAdd}
        onChooseTask={onChooseTaskFromQuickAdd}
        onChooseFollowUp={onChooseFollowUpFromQuickAdd}
      />

      <FollowUpCalendarHintModal
        open={followUpHintOpen}
        onOpenChange={(o) => {
          setFollowUpHintOpen(o);
          if (!o) setFollowUpHintSummary("");
        }}
        prefillSummary={followUpHintSummary}
      />

      <NewTaskModal
        open={newTaskOpen}
        onOpenChange={onNewTaskOpenChange}
        initialDueDate={taskDuePrefill?.date ?? null}
        initialDueTime={taskDuePrefill?.time ?? null}
        onCreated={() => void mutate()}
      />
    </div>
  );
}
