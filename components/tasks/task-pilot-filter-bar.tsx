"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookmarkPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TASK_PILOT_FILTERS,
  filtersToSearchParams,
  isNonDefaultTaskPilotFilters,
  parseTaskPilotFilters,
  type TaskPilotFilters,
} from "@/lib/tasks/task-pilot-filters";
import {
  addTaskPilotSavedView,
  loadTaskPilotSavedViews,
  removeTaskPilotSavedView,
  type TaskPilotSavedViewRecord,
} from "@/lib/tasks/task-pilot-saved-views-storage";

const chipBase =
  "rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-kp-teal/50";

function filtersEqual(a: TaskPilotFilters, b: TaskPilotFilters) {
  return (
    a.status === b.status &&
    a.due === b.due &&
    a.contactLinked === b.contactLinked &&
    a.propertyLinked === b.propertyLinked &&
    a.priority === b.priority
  );
}

function replaceTaskPilotQuery(router: ReturnType<typeof useRouter>, pathname: string, next: TaskPilotFilters) {
  const qs = filtersToSearchParams(next).toString();
  const url = qs ? `${pathname}?${qs}` : pathname;
  router.replace(url, { scroll: false });
}

type Preset = { label: string; filters: TaskPilotFilters };

const PRESETS: Preset[] = [
  { label: "All", filters: DEFAULT_TASK_PILOT_FILTERS },
  { label: "Open", filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "open" } },
  { label: "Done", filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "completed" } },
  { label: "Overdue", filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "open", due: "overdue" } },
  { label: "Due today", filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "open", due: "today" } },
  {
    label: "Upcoming",
    filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "open", due: "upcoming" },
  },
  {
    label: "No due date",
    filters: { ...DEFAULT_TASK_PILOT_FILTERS, status: "open", due: "none" },
  },
  {
    label: "Contact",
    filters: {
      ...DEFAULT_TASK_PILOT_FILTERS,
      status: "open",
      contactLinked: true,
    },
  },
  {
    label: "Property",
    filters: {
      ...DEFAULT_TASK_PILOT_FILTERS,
      status: "open",
      propertyLinked: true,
    },
  },
];

export function TaskPilotFilterBar({ matchCount }: { matchCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseTaskPilotFilters(searchParams), [searchParams]);
  const [savedViews, setSavedViews] = useState<TaskPilotSavedViewRecord[]>(() => loadTaskPilotSavedViews());

  const push = useCallback(
    (next: TaskPilotFilters) => {
      const qs = filtersToSearchParams(next).toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router]
  );

  const clearAll = useCallback(() => {
    replaceTaskPilotQuery(router, pathname, DEFAULT_TASK_PILOT_FILTERS);
  }, [pathname, router]);

  const toggleContact = useCallback(() => {
    push({
      ...filters,
      contactLinked: !filters.contactLinked,
    });
  }, [filters, push]);

  const toggleProperty = useCallback(() => {
    push({
      ...filters,
      propertyLinked: !filters.propertyLinked,
    });
  }, [filters, push]);

  const setPriority = useCallback(
    (priority: TaskPilotFilters["priority"]) => {
      push({ ...filters, priority });
    },
    [filters, push]
  );

  const saveCurrent = useCallback(() => {
    const raw = window.prompt("Name this view (saved in this browser only)");
    if (raw == null) return;
    const qs = filtersToSearchParams(filters).toString();
    const result = addTaskPilotSavedView(raw, qs);
    if (!result.ok) {
      if (result.reason === "duplicate") {
        toast.message("A saved view with these filters already exists.");
      } else if (result.reason === "limit") {
        toast.error("Saved view limit reached — remove one from the list below.");
      } else {
        toast.error("Enter a name to save.");
      }
      return;
    }
    toast.success("View saved");
    setSavedViews(loadTaskPilotSavedViews());
  }, [filters]);

  const applySavedQuery = useCallback(
    (query: string) => {
      const url = query.trim() ? `${pathname}?${query.trim()}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router]
  );

  const removeSaved = useCallback((id: string) => {
    removeTaskPilotSavedView(id);
    setSavedViews(loadTaskPilotSavedViews());
    toast.message("Removed saved view");
  }, []);

  const hasExtra = isNonDefaultTaskPilotFilters(filters);

  return (
    <div className="space-y-2 rounded-lg border border-kp-outline/60 bg-kp-surface-high/[0.06] p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Views</span>
        {PRESETS.filter((p) => p.label !== "Contact" && p.label !== "Property").map((p) => {
          const active = filtersEqual(filters, p.filters);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => push(p.filters)}
              className={cn(
                chipBase,
                active
                  ? "border-kp-teal/50 bg-kp-teal/15 text-kp-teal"
                  : "border-kp-outline/60 bg-kp-surface-high/20 text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
              )}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={toggleContact}
          className={cn(
            chipBase,
            filters.contactLinked
              ? "border-kp-teal/50 bg-kp-teal/15 text-kp-teal"
              : "border-kp-outline/60 bg-kp-surface-high/20 text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
          )}
        >
          Has contact
        </button>
        <button
          type="button"
          onClick={toggleProperty}
          className={cn(
            chipBase,
            filters.propertyLinked
              ? "border-kp-teal/50 bg-kp-teal/15 text-kp-teal"
              : "border-kp-outline/60 bg-kp-surface-high/20 text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
          )}
        >
          Has property
        </button>
        <span className="mx-0.5 hidden h-4 w-px bg-kp-outline/50 sm:inline" aria-hidden />
        <span className="text-[9px] font-bold uppercase tracking-wider text-kp-on-surface-muted">Priority</span>
        {(
          [
            { label: "Any", value: null as TaskPilotFilters["priority"] },
            { label: "High", value: "HIGH" as const },
            { label: "Med", value: "MEDIUM" as const },
            { label: "Low", value: "LOW" as const },
          ] as const
        ).map(({ label, value }) => {
          const active = filters.priority === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPriority(value)}
              className={cn(
                chipBase,
                active
                  ? "border-kp-teal/50 bg-kp-teal/15 text-kp-teal"
                  : "border-kp-outline/60 bg-kp-surface-high/20 text-kp-on-surface-variant hover:border-kp-outline hover:text-kp-on-surface"
              )}
            >
              {label}
            </button>
          );
        })}
        {hasExtra ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-kp-on-surface-muted hover:text-kp-on-surface"
            onClick={clearAll}
          >
            <X className="h-3 w-3" />
            Reset
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-kp-outline/40 pt-2">
        <p className="text-[11px] text-kp-on-surface-muted">
          {hasExtra ? (
            <>
              Showing <span className="font-semibold text-kp-on-surface-variant">{matchCount}</span> matching
              tasks · URL reflects filters (shareable)
            </>
          ) : (
            <>Default list · use chips to narrow or save a browser-only preset</>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 border-kp-outline/70 px-2 text-[11px] font-semibold"
            onClick={saveCurrent}
          >
            <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
            Save current
          </Button>
        </div>
      </div>
      {savedViews.length > 0 ? (
        <div className="border-t border-kp-outline/40 pt-2">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-kp-on-surface-muted">
            Saved in this browser
          </p>
          <ul className="flex flex-col gap-1">
            {savedViews.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-1 rounded border border-kp-outline/50 bg-kp-surface-high/15 px-2 py-1"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-kp-teal hover:underline"
                  onClick={() => applySavedQuery(v.query)}
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  className="shrink-0 rounded p-1 text-kp-on-surface-muted hover:bg-kp-surface-high/40 hover:text-kp-on-surface"
                  aria-label={`Remove ${v.name}`}
                  onClick={() => removeSaved(v.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
