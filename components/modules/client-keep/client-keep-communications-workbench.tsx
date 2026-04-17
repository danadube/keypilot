"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  History,
  Inbox,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { UI_COPY } from "@/lib/ui-copy";
import { formatFeedActivityTimestamp } from "@/lib/activity/format-feed-activity-timestamp";
import type { ClientKeepCommunicationsResponse } from "@/lib/validations/client-keep-communications";

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-kp-outline/80 bg-kp-surface/40 px-4 py-3 shadow-sm sm:px-5 sm:py-4"
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kp-gold" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-kp-on-surface">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-snug text-kp-on-surface-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-kp-outline/60 bg-kp-bg/50 px-3 py-3 text-center text-sm leading-snug text-kp-on-surface-muted">
      {children}
    </p>
  );
}

function doFirstKindLabel(
  kind: ClientKeepCommunicationsResponse["doFirst"][number]["kind"]
): string {
  switch (kind) {
    case "overdue_reminder":
      return "Reminder";
    case "overdue_follow_up":
      return "Follow-up";
    case "draft":
      return "Draft";
    default:
      return "Action";
  }
}

function scheduledKindLabel(
  kind: ClientKeepCommunicationsResponse["scheduled"][number]["kind"]
): string {
  switch (kind) {
    case "reminder":
      return "Reminder";
    case "follow_up_task":
      return "Follow-up";
    case "crm_task":
      return "Task";
    default:
      return "Scheduled";
  }
}

export function ClientKeepCommunicationsWorkbench() {
  const [data, setData] = useState<ClientKeepCommunicationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/client-keep/communications");
      const json = await res.json();
      if (!res.ok) {
        setError((json.error?.message as string) ?? UI_COPY.errors.load("communications"));
        setData(null);
        return;
      }
      setData(json.data as ClientKeepCommunicationsResponse);
    } catch {
      setError(UI_COPY.errors.load("communications"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showSkeleton = loading && !data;
  const showContent = !loading && !error && data != null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-kp-on-surface-muted">
            ClientKeep
          </p>
          <h1 className="text-xl font-semibold text-kp-on-surface">Communications</h1>
          <p className="mt-1 max-w-2xl text-sm text-kp-on-surface-muted">
            Pending work, what&apos;s scheduled next, and recent touchpoints — so you can answer
            &quot;what should I do first?&quot; without hunting through menus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
            <Link href="/client-keep/follow-ups">
              All follow-ups
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
            <Link href="/contacts/all">Contacts</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="flex min-h-[200px] items-center justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
        </div>
      ) : null}

      {showContent && data ? (
        <div className="grid gap-4 lg:grid-cols-12 lg:items-start lg:gap-5">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <Section
              title="Do first"
              description="Overdue reminders and follow-ups, plus open visitor follow-up drafts — highest priority at the top."
              icon={Sparkles}
            >
              {data.doFirst.length === 0 ? (
                <EmptyRow>
                  Nothing overdue or waiting on a draft. Check{" "}
                  <Link
                    href="/client-keep/follow-ups"
                    className="font-medium text-kp-gold underline-offset-2 hover:underline"
                  >
                    follow-ups
                  </Link>{" "}
                  for the full list.
                </EmptyRow>
              ) : (
                <ul className="space-y-1.5">
                  {data.doFirst.map((row) => (
                    <li key={`${row.kind}:${row.id}`}>
                      <Link
                        href={row.href}
                        className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-gold/40 hover:bg-kp-surface-high/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-kp-on-surface">
                              {row.contactName}
                            </span>
                            <span className="shrink-0 rounded bg-kp-bg/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                              {doFirstKindLabel(row.kind)}
                            </span>
                          </div>
                          <p className="text-sm text-kp-on-surface-variant">{row.headline}</p>
                          {row.subline ? (
                            <p className="line-clamp-2 text-xs text-kp-on-surface-muted">{row.subline}</p>
                          ) : null}
                          {row.dueAt ? (
                            <p className="text-[11px] text-kp-on-surface-muted">
                              Due {formatFeedActivityTimestamp(row.dueAt)}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Scheduled next"
              description="Reminders, people follow-ups, and CRM tasks with a due time — soonest first."
              icon={CalendarClock}
            >
              {data.scheduled.length === 0 ? (
                <EmptyRow>No upcoming communication tasks on your calendar.</EmptyRow>
              ) : (
                <ul className="space-y-1.5">
                  {data.scheduled.map((row) => (
                    <li key={`${row.kind}:${row.id}`}>
                      <Link
                        href={row.href}
                        className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-teal/35 hover:bg-kp-surface-high/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-kp-on-surface">{row.label}</span>
                            <span className="shrink-0 rounded bg-kp-bg/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                              {scheduledKindLabel(row.kind)}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-xs text-kp-on-surface-muted">{row.subline}</p>
                          <p className="text-[11px] text-kp-on-surface-muted">
                            Due {formatFeedActivityTimestamp(row.dueAt)}
                          </p>
                        </div>
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Section
              title="Recent touchpoints"
              description="Latest logged calls, emails, notes, and follow-up activity (CRM stream)."
              icon={History}
            >
              {data.recent.length === 0 ? (
                <EmptyRow>
                  Log calls and email from a contact&apos;s detail page, or use{" "}
                  <Link
                    href="/showing-hq/activity"
                    className="font-medium text-kp-gold underline-offset-2 hover:underline"
                  >
                    ShowingHQ Activity
                  </Link>{" "}
                  for tasks.
                </EmptyRow>
              ) : (
                <ul className="space-y-1.5">
                  {data.recent.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-outline hover:bg-kp-surface-high/45"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                              {row.typeLabel}
                            </span>
                            <span className="text-[11px] text-kp-on-surface-muted">
                              {formatFeedActivityTimestamp(row.eventAt)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-kp-on-surface">{row.title}</p>
                          {row.contactName ? (
                            <p className="text-xs text-kp-on-surface-muted">{row.contactName}</p>
                          ) : null}
                          {row.subline ? (
                            <p className="line-clamp-2 text-xs text-kp-on-surface-variant">{row.subline}</p>
                          ) : null}
                        </div>
                        <ChevronRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <div className="rounded-xl border border-kp-outline/60 bg-kp-bg/30 px-4 py-3">
              <div className="flex items-start gap-2">
                <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-variant" aria-hidden />
                <div className="min-w-0 text-xs leading-relaxed text-kp-on-surface-muted">
                  <p className="font-medium text-kp-on-surface-variant">More tools</p>
                  <p className="mt-1">
                    <Link
                      href="/client-keep/activity"
                      className="text-kp-gold underline-offset-2 hover:underline"
                    >
                      Full activity feed
                    </Link>
                    {" · "}
                    <Link
                      href="/showing-hq/activity"
                      className="text-kp-gold underline-offset-2 hover:underline"
                    >
                      ShowingHQ tasks
                    </Link>
                    {" · "}
                    <Link
                      href="/showing-hq/showings"
                      className="text-kp-gold underline-offset-2 hover:underline"
                    >
                      Private showings
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
