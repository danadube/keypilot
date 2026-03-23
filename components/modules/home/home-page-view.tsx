"use client";

/**
 * HomePageView — dark premium shell for the KeyPilot Home dashboard.
 *
 * All state, data fetching, calendar logic, and derived values are
 * preserved exactly from the original HomePage. Only the presentational
 * layer (tokens, card shells, section wrappers) is replaced.
 *
 * Deferred (kept as-is inside dark panel wrappers):
 *   - AITodoItem — uses BrandBadge; migrate in a later Home phase
 *   - PriorityEmailCard — uses BrandBadge + SuggestedReplySection; defer
 *
 * Route: app/(dashboard)/page.tsx → DashboardLanding → HomePage → HomePageView
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  Mail,
  Plus,
  LayoutDashboard,
  Users,
  MapPin,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AITodoItem, type AITodo } from "@/components/home/AITodoItem";
import { PriorityEmailCard, type PriorityEmail } from "@/components/home/PriorityEmailCard";
import { MODULES, MODULE_ORDER } from "@/lib/modules";

// ── Constants ─────────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 2;
const AUTH_WAIT_MS = 2500;

// ── Types (preserved from original) ──────────────────────────────────────────

type Stats = {
  propertiesCount: number;
  openHousesCount: number;
  contactsCount: number;
  recentOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
};

type CalendarEventType = "showing" | "open_house" | "task" | "campaign" | "external";
type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  type: CalendarEventType;
  href?: string;
  meta?: string;
};

type CalendarData = {
  events: {
    id: string;
    title: string;
    startAt: string;
    type: string;
    meta?: string;
  }[];
  hasCalendarConnection: boolean;
};
type EmailData = {
  emails: {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    receivedAt: string;
    classification?: string;
    aiSummary?: string;
    href?: string;
    threadId?: string;
  }[];
  hasGmailConnection: boolean;
};

// ── Calendar logic (preserved exactly) ───────────────────────────────────────

function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarEvents(
  recentOpenHouses: Stats["recentOpenHouses"],
  externalEvents: { id: string; title: string; startAt: string; type: string; meta?: string }[],
  hasCalendarConnection: boolean,
  todayStart: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  recentOpenHouses?.forEach((oh) => {
    const d = new Date(oh.startAt);
    if (d >= todayStart) {
      events.push({
        id: `oh-${oh.id}`,
        title: oh.title,
        startAt: oh.startAt,
        type: "open_house",
        href: `/open-houses/${oh.id}`,
        meta: oh.property.address1,
      });
    }
  });

  externalEvents.forEach((e) => {
    const d = new Date(e.startAt);
    if (d >= todayStart) {
      events.push({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        type: "external",
        meta: e.meta,
      });
    }
  });

  if (!hasCalendarConnection) {
    for (let i = 0; i < 3; i++) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() + i);
      date.setHours(10 + i, 0, 0, 0);
      events.push({
        id: `mock-showing-${i}`,
        title: `Showing · ${["123 Oak St", "456 Elm Ave", "789 Pine Rd"][i]}`,
        startAt: date.toISOString(),
        type: "showing",
        meta: "Buyer tour",
      });
    }
    for (let i = 0; i < 2; i++) {
      const date = new Date(todayStart);
      date.setDate(date.getDate() + i + 1);
      date.setHours(14, 0, 0, 0);
      events.push({
        id: `mock-task-${i}`,
        title: ["Follow up with lead", "Send listing docs"][i],
        startAt: date.toISOString(),
        type: "task",
        href: "/task-pilot",
      });
    }
    const campaignDate = new Date(todayStart);
    campaignDate.setDate(campaignDate.getDate() + 5);
    campaignDate.setHours(9, 0, 0, 0);
    events.push({
      id: "mock-campaign-1",
      title: "FarmTrackr mailing drop",
      startAt: campaignDate.toISOString(),
      type: "campaign",
      meta: "Downtown loop",
    });
  }

  return events.sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );
}

// ── Calendar event type → dark premium border + bg ────────────────────────────

const EVENT_ROW_STYLES: Record<CalendarEventType, string> = {
  showing:    "border-l-kp-teal    bg-kp-teal/10",
  open_house: "border-l-emerald-400 bg-emerald-400/10",
  task:       "border-l-kp-gold   bg-kp-gold/10",
  campaign:   "border-l-violet-400 bg-violet-400/10",
  external:   "border-l-sky-400   bg-sky-400/10",
};

const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  showing:    "Showing",
  open_house: "Open House",
  task:       "Task",
  campaign:   "Campaign",
  external:   "Calendar",
};

// ── Module icon map ───────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ElementType> = {
  "property-vault": Building2,
  "showing-hq":     Calendar,
  "client-keep":    Users,
  "farm-trackr":    MapPin,
  "task-pilot":     CheckSquare,
  "market-pilot":   TrendingUp,
  "seller-pulse":   BarChart3,
  insight:          BarChart3,
  settings:         LayoutDashboard,
};

// ── Loading / error ───────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
      <AlertCircle className="h-5 w-5 text-red-400" />
      <p className="text-sm text-kp-on-surface-variant">{message}</p>
      <button
        onClick={onRetry}
        className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}

// ── KPI card (same pattern as Showing-HQ dashboard) ───────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  accent = "default",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  href: string;
  accent?: "teal" | "gold" | "default";
}) {
  const valueColor =
    accent === "teal"
      ? "text-kp-teal"
      : accent === "gold"
        ? "text-kp-gold"
        : "text-kp-on-surface";

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-kp-outline bg-kp-surface p-4",
        "transition-colors hover:border-kp-teal/40 hover:bg-kp-surface-high"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-kp-on-surface-variant">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-kp-on-surface-variant group-hover:text-kp-teal transition-colors" />
      </div>
      <span className={cn("text-2xl font-bold tabular-nums leading-none tracking-tight", valueColor)}>
        {value}
      </span>
    </Link>
  );
}

// ── Section panel wrapper ─────────────────────────────────────────────────────

function SectionPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-kp-outline bg-kp-surface", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-kp-outline px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-kp-on-surface">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-kp-on-surface-variant">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HomePageView() {
  const { isLoaded } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [taskSuggestions, setTaskSuggestions] = useState<AITodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });

  const loadData = (retryCount = 0) => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/ai/home-briefing")
      .then((r) => r.json())
      .then((briefing) => {
        if (briefing?.error) throw new Error(briefing.error.message);
        const data = briefing.data ?? {};
        setStats(data.stats ?? null);
        setCalendarData({
          events: data.calendarEvents ?? [],
          hasCalendarConnection: data.hasCalendarConnection ?? false,
        });
        setEmailData({
          emails: data.interpretedEmails ?? [],
          hasGmailConnection: data.hasGmailConnection ?? false,
        });
        const tasks = (data.taskSuggestions ?? []).map(
          (t: {
            id: string;
            title: string;
            source: AITodo["source"];
            href?: string;
            meta?: string;
          }) => ({ id: t.id, title: t.title, source: t.source, href: t.href, meta: t.meta })
        );
        setTaskSuggestions(tasks);
      })
      .catch((err) => {
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => loadData(retryCount + 1), RETRY_DELAY_MS);
        } else {
          setError(err?.message ?? "Failed to load");
          setLoading(false);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoaded) {
      const t = setTimeout(() => loadData(), AUTH_WAIT_MS);
      return () => clearTimeout(t);
    }
    loadData();
  }, [isLoaded]);

  if (loading && !stats) return <LoadingState />;
  if (error && !stats)
    return <ErrorState message={error} onRetry={() => loadData()} />;

  // ── Derived values (preserved exactly) ───────────────────────────────────

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const showingsToday = (stats?.recentOpenHouses ?? []).filter((oh) =>
    isSameDay(new Date(oh.startAt), today)
  ).length;
  const needsReply = emailData?.hasGmailConnection
    ? emailData.emails.filter((e) => e.classification === "needs_reply").length
    : 0;
  const tasksDue = taskSuggestions.length;

  const allEvents = buildCalendarEvents(
    stats?.recentOpenHouses ?? [],
    calendarData?.events ?? [],
    calendarData?.hasCalendarConnection ?? false,
    todayStart
  );
  const weekDays = getWeekDays(selectedDay);
  const eventsForDay = allEvents.filter((e) =>
    isSameDay(new Date(e.startAt), selectedDay)
  );
  const hasEventsOnDay = (d: Date) =>
    allEvents.some((e) => isSameDay(new Date(e.startAt), d));

  const selectedDayFormatted = selectedDay.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const todayFormatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const formatEmailDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24)
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Fallback AI todos when no real data
  const aiTodosForUi: AITodo[] =
    taskSuggestions.length > 0
      ? taskSuggestions
      : [
          { id: "1", title: "Reply to John about showing time", source: "email", meta: "From yesterday", href: "#" },
          { id: "2", title: "Prep for 10am Oak St showing", source: "showing", meta: "123 Oak St", href: "/open-houses" },
          { id: "3", title: "Follow up with Smith lead", source: "lead", meta: "Viewed 3 properties", href: "/contacts" },
          { id: "4", title: "Send listing docs to buyer", source: "follow_up", meta: "Requested Tue", href: "/task-pilot" },
        ];

  // Fallback emails when no Gmail connection
  const priorityEmailsForUi: PriorityEmail[] =
    emailData?.hasGmailConnection && emailData.emails.length > 0
      ? emailData.emails.slice(0, 10).map((e) => ({
          id: e.id,
          sender: e.sender,
          subject: e.subject,
          aiSummary: e.aiSummary ?? e.snippet?.slice(0, 120) ?? undefined,
          status: (e.classification as PriorityEmail["status"]) ?? "informational",
          date: formatEmailDate(e.receivedAt),
          href: e.href,
          snippet: e.snippet,
          threadId: e.threadId,
        }))
      : [
          { id: "1", sender: "Sarah Chen", subject: "Re: 456 Elm - inspection schedule", aiSummary: "Buyer requesting flexible inspection window next week.", status: "needs_reply", date: "Today 9:12 AM", href: "#" },
          { id: "2", sender: "Mike Torres", subject: "Closing docs signed", aiSummary: "All closing documents have been executed. Settlement next Friday.", status: "informational", date: "Today 8:45 AM", href: "#" },
          { id: "3", sender: "Jennifer Walsh", subject: "Open house feedback", aiSummary: "Two serious buyers interested. Waiting on pre-approval from one.", status: "waiting", date: "Yesterday 4:30 PM", href: "#" },
        ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
            Home
          </h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            {todayFormatted} · KeyPilot command center
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <Link
            href="/properties/new"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-3 py-2",
              "text-sm font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add property
          </Link>
          <Link
            href="/open-houses/new"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-kp-gold px-3 py-2",
              "text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            New open house
          </Link>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Active Properties"
          value={stats?.propertiesCount ?? 0}
          icon={Building2}
          href="/properties"
          accent="teal"
        />
        <KpiCard
          label="Showings Today"
          value={showingsToday}
          icon={Calendar}
          href="/open-houses"
          accent="gold"
        />
        <KpiCard
          label="Needs Reply"
          value={needsReply}
          icon={Mail}
          href="/"
          accent={needsReply > 0 ? "gold" : "default"}
        />
        <KpiCard
          label="Tasks Due"
          value={tasksDue}
          icon={CheckSquare}
          href="/task-pilot"
          accent="default"
        />
      </div>

      {/* ── Calendar ─────────────────────────────────────────────────────── */}
      <SectionPanel
        title="Today's Calendar"
        description={`${todayFormatted} · Google Calendar + KeyPilot events`}
      >
        <div className="p-5">
          {/* Week strip */}
          <div className="mb-5 flex items-center justify-between gap-1">
            {weekDays.map((d, i) => {
              const isSelected = isSameDay(d, selectedDay);
              const isToday = isSameDay(d, today);
              const hasEvents = hasEventsOnDay(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(new Date(d))}
                  className={cn(
                    "flex min-w-[2.25rem] flex-col items-center justify-center rounded-lg px-1 py-2",
                    "text-xs font-medium transition-colors",
                    isSelected && "bg-kp-teal text-kp-bg",
                    !isSelected && isToday && "ring-1 ring-kp-teal text-kp-teal",
                    !isSelected &&
                      !isToday &&
                      "text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                  )}
                >
                  <span className="text-[10px] uppercase opacity-70">{dayLabels[i]}</span>
                  <span>{d.getDate()}</span>
                  {hasEvents && (
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-kp-bg/70" : "bg-kp-teal"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Event list */}
          <p className="mb-2.5 text-xs font-medium text-kp-on-surface-variant">
            {selectedDayFormatted}
          </p>
          {eventsForDay.length === 0 ? (
            <p className="py-3 text-sm text-kp-on-surface-variant">No events</p>
          ) : (
            <div className="space-y-2">
              {eventsForDay.map((ev) => {
                const row = (
                  <div
                    className={cn(
                      "rounded-lg border-l-4 p-3",
                      EVENT_ROW_STYLES[ev.type]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-kp-on-surface">{ev.title}</p>
                        <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                          {formatTime(ev.startAt)}
                          {ev.meta && ` · ${ev.meta}`}
                        </p>
                      </div>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                        {EVENT_TYPE_LABEL[ev.type]}
                      </span>
                    </div>
                  </div>
                );
                return ev.href ? (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className="block transition-opacity hover:opacity-85"
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={ev.id}>{row}</div>
                );
              })}
            </div>
          )}
        </div>
      </SectionPanel>

      {/* ── AI To-Do — panel wraps existing component (deferred migration) ── */}
      <SectionPanel
        title="AI To-Do List"
        description="Tasks from Gmail, Calendar, showings, open houses, leads & follow-ups"
        action={
          <Link href="/task-pilot" className="text-xs text-kp-teal hover:underline">
            Task Pilot
          </Link>
        }
      >
        <div className="divide-y divide-kp-outline-variant p-2">
          {aiTodosForUi.map((todo) => (
            <AITodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      </SectionPanel>

      {/* ── Priority Emails — panel wraps existing component (deferred) ─── */}
      <SectionPanel
        title="Priority Emails"
        description={
          emailData?.hasGmailConnection
            ? "From your connected inbox"
            : "Connect Gmail to see real emails"
        }
        action={
          !emailData?.hasGmailConnection ? (
            <Link
              href="/api/v1/auth/google/connect?service=gmail"
              className="text-xs font-medium text-kp-teal hover:underline"
            >
              Connect Gmail
            </Link>
          ) : undefined
        }
      >
        <div className="divide-y divide-kp-outline-variant p-2">
          {priorityEmailsForUi.map((email) => (
            <PriorityEmailCard key={email.id} email={email} />
          ))}
        </div>
      </SectionPanel>

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      <SectionPanel
        title="Recent activity"
        description="Latest open house events"
        action={
          <Link href="/open-houses" className="text-xs text-kp-teal hover:underline">
            All open houses
          </Link>
        }
      >
        {!stats?.recentOpenHouses?.length ? (
          <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
            <p className="text-sm font-medium text-kp-on-surface">No recent activity</p>
            <p className="text-xs text-kp-on-surface-variant">
              Activity from your showings will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-kp-outline-variant">
            {stats.recentOpenHouses.slice(0, 4).map((oh) => (
              <Link
                key={oh.id}
                href={`/open-houses/${oh.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-kp-surface-high"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-kp-on-surface">{oh.title}</p>
                  <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                    {oh.property.city} · {oh._count.visitors} visitors
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
              </Link>
            ))}
          </div>
        )}
      </SectionPanel>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
          Quick actions
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/properties/new"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-kp-gold px-4 py-2",
              "text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright"
            )}
          >
            <Plus className="h-4 w-4" />
            Add property
          </Link>
          <Link
            href="/open-houses/new"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg bg-kp-teal px-4 py-2",
              "text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-teal/90"
            )}
          >
            <Plus className="h-4 w-4" />
            New open house
          </Link>
          <Link
            href="/open-houses/sign-in"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-kp-outline px-4 py-2",
              "text-sm font-medium text-kp-on-surface transition-colors hover:bg-kp-surface-high"
            )}
          >
            <Calendar className="h-4 w-4" />
            Open sign-in
          </Link>
        </div>
      </div>

      {/* ── Module grid ──────────────────────────────────────────────────── */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
          Modules
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULE_ORDER.filter((id) => id !== "home").map((id) => {
            const mod = MODULES[id];
            const Icon = MODULE_ICONS[id] ?? LayoutDashboard;
            return (
              <Link
                key={id}
                href={mod.href}
                className={cn(
                  "group flex items-center justify-between rounded-xl border border-kp-outline",
                  "bg-kp-surface p-4 transition-colors hover:border-kp-teal/40 hover:bg-kp-surface-high",
                  !mod.available && "opacity-50 pointer-events-none"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kp-surface-high group-hover:bg-kp-teal/10 transition-colors">
                    <Icon className="h-4 w-4 text-kp-on-surface-variant group-hover:text-kp-teal transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-kp-on-surface">{mod.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-kp-on-surface-variant" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
