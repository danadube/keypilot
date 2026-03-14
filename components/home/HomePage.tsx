"use client";

/**
 * Home page with calendar, priority emails, AI to-do.
 * Multi-source design: Calendar, Priority Emails, and AI To-Do will aggregate
 * from multiple connected accounts (enabledForCalendar, enabledForPriorityInbox,
 * enabledForAi). Data fetching will accept connectionIds to filter enabled sources.
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
} from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandStatCard } from "@/components/ui/BrandStatCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { AITodoItem, type AITodo } from "@/components/home/AITodoItem";
import { PriorityEmailCard, type PriorityEmail } from "@/components/home/PriorityEmailCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { cn } from "@/lib/utils";
import { MODULES, MODULE_ORDER } from "@/lib/modules";

const RETRY_DELAY_MS = 500;
const MAX_RETRIES = 2;
const AUTH_WAIT_MS = 2500;

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

const EVENT_ROW_STYLES: Record<CalendarEventType, string> = {
  showing: "border-l-4 border-l-[#2563EB] bg-[#2563EB]/5",
  open_house: "border-l-4 border-l-[#22C55E] bg-[#22C55E]/5",
  task: "border-l-4 border-l-[#D97706] bg-[#D97706]/5",
  campaign: "border-l-4 border-l-[#7C3AED] bg-[#7C3AED]/5",
  external: "border-l-4 border-l-[#6366F1] bg-[#6366F1]/5",
};

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Build calendar events: open houses + external (Google Calendar) + mock when no connection. */
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
    // Mock events when no calendar connected
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

  return events.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

type CalendarData = { events: { id: string; title: string; startAt: string; type: string; meta?: string }[]; hasCalendarConnection: boolean };

export function HomePage() {
  const { isLoaded } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });

  const loadData = (retryCount = 0) => {
    setError(null);
    setLoading(true);
    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const timeMax = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      fetch("/api/v1/dashboard/stats").then((r) => r.json()),
      fetch(`/api/v1/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`).then((r) => r.json()),
    ])
      .then(([statsJson, calendarJson]) => {
        if (statsJson?.error) throw new Error(statsJson.error.message);
        setStats(statsJson.data ?? null);
        setCalendarData(
          calendarJson?.data
            ? { events: calendarJson.data.events ?? [], hasCalendarConnection: calendarJson.data.hasCalendarConnection ?? false }
            : { events: [], hasCalendarConnection: false }
        );
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

  if (loading && !stats) return <PageLoading message="Loading..." />;
  if (error && !stats)
    return (
      <ErrorMessage
        message={error}
        onRetry={() => loadData()}
      />
    );

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const showingsToday = (stats?.recentOpenHouses ?? []).filter(
    (oh) => isSameDay(new Date(oh.startAt), today)
  ).length;
  const needsReply = 3;
  const tasksDue = 2;
  const allEvents = buildCalendarEvents(
    stats?.recentOpenHouses ?? [],
    calendarData?.events ?? [],
    calendarData?.hasCalendarConnection ?? false,
    todayStart
  );
  const weekDays = getWeekDays(selectedDay);
  const eventsForDay = allEvents.filter((e) => isSameDay(new Date(e.startAt), selectedDay));
  const hasEventsOnDay = (d: Date) => allEvents.some((e) => isSameDay(new Date(e.startAt), d));
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
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Mock data for AI To-Do List (Gmail, Calendar, showings, leads, follow-ups)
  const mockAITodos: AITodo[] = [
    { id: "1", title: "Reply to John about showing time", source: "email", meta: "From yesterday", href: "#" },
    { id: "2", title: "Prep for 10am Oak St showing", source: "showing", meta: "123 Oak St", href: "/open-houses" },
    { id: "3", title: "Follow up with Smith lead", source: "lead", meta: "Viewed 3 properties", href: "/contacts" },
    { id: "4", title: "Send listing docs to buyer", source: "follow_up", meta: "Requested Tue", href: "/task-pilot" },
  ];

  // Mock data for Priority Emails (Gmail integration)
  const mockPriorityEmails: PriorityEmail[] = [
    { id: "1", sender: "Sarah Chen", subject: "Re: 456 Elm - inspection schedule", aiSummary: "Buyer requesting flexible inspection window next week.", status: "needs_reply", date: "Today 9:12 AM", href: "#" },
    { id: "2", sender: "Mike Torres", subject: "Closing docs signed", aiSummary: "All closing documents have been executed. Settlement next Friday.", status: "informational", date: "Today 8:45 AM", href: "#" },
    { id: "3", sender: "Jennifer Walsh", subject: "Open house feedback", aiSummary: "Two serious buyers interested. Waiting on pre-approval from one.", status: "waiting", date: "Yesterday 4:30 PM", href: "#" },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="Home"
        description="Your KeyPilot command center across properties, showings, contacts, tasks, and activity."
      />

      {/* 1. Quick Stats */}
      <section>
        <BrandSectionHeader title="Quick stats" description="High-level overview" />
        <div className="grid gap-[var(--space-md)] sm:grid-cols-2 md:grid-cols-4 -mt-[var(--space-sm)]">
          <div className="flex flex-col gap-[var(--space-sm)]">
            <BrandStatCard
              title="Active Properties"
              value={stats?.propertiesCount ?? 0}
              accent="primary"
              icon={<Building2 className="h-5 w-5" />}
            />
            <BrandButton variant="ghost" size="sm" className="text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]" asChild>
              <Link href="/properties">View all</Link>
            </BrandButton>
          </div>
          <div className="flex flex-col gap-[var(--space-sm)]">
            <BrandStatCard
              title="Showings Today"
              value={showingsToday}
              accent="accent"
              icon={<Calendar className="h-5 w-5" />}
            />
            <BrandButton variant="ghost" size="sm" className="text-[var(--brand-accent)] hover:opacity-80" asChild>
              <Link href="/open-houses">View calendar</Link>
            </BrandButton>
          </div>
          <div className="flex flex-col gap-[var(--space-sm)]">
            <BrandStatCard
              title="Needs Reply"
              value={needsReply}
              accent="accent"
              icon={<Mail className="h-5 w-5" />}
            />
            <BrandButton variant="ghost" size="sm" className="text-[var(--brand-danger)] hover:opacity-80" asChild>
              <Link href="/">View emails</Link>
            </BrandButton>
          </div>
          <div className="flex flex-col gap-[var(--space-sm)]">
            <BrandStatCard
              title="Tasks Due"
              value={tasksDue}
              accent="secondary"
              icon={<CheckSquare className="h-5 w-5" />}
            />
            <BrandButton variant="ghost" size="sm" className="text-[var(--brand-secondary)] hover:opacity-80" asChild>
              <Link href="/task-pilot">View tasks</Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* 2. Today's Calendar — Google Calendar + KeyPilot events */}
      <section>
        <BrandSectionHeader
          title="Today's Calendar"
          description={`${todayFormatted} · Google Calendar + KeyPilot showings, open houses, deadlines`}
        />
        <BrandCard elevated padded>
          <div className="flex flex-col gap-4">
            {/* Week strip */}
            <div className="flex items-center justify-between gap-1">
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
                      "flex flex-col items-center justify-center min-w-[2.25rem] py-2 px-1 rounded-[var(--radius-md)] text-xs font-medium transition-colors",
                      isSelected && "bg-[var(--brand-primary)] text-white",
                      !isSelected && isToday && "ring-1 ring-[var(--brand-primary)] text-[var(--brand-primary)]",
                      !isSelected && !isToday && "text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]"
                    )}
                  >
                    <span className="text-[10px] uppercase text-inherit/70">{dayLabels[i]}</span>
                    <span>{d.getDate()}</span>
                    {hasEvents && (
                      <span
                        className={cn(
                          "mt-1 w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white/80" : "bg-[var(--brand-primary)]"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Event list for selected day */}
            <div>
              <p className="text-xs font-medium text-[var(--brand-text-muted)] mb-2">{selectedDayFormatted}</p>
              {eventsForDay.length === 0 ? (
                <p className="text-sm text-[var(--brand-text-muted)] py-2">No events</p>
              ) : (
                <div className="space-y-2">
                  {eventsForDay.map((ev) => {
                    const content = (
                      <div
                        className={cn(
                          "rounded-[var(--radius-md)] border-l-4 p-3",
                          EVENT_ROW_STYLES[ev.type]
                        )}
                      >
                        <p className="font-medium text-[var(--brand-text)] text-sm">{ev.title}</p>
                        <p className="text-xs text-[var(--brand-text-muted)] mt-0.5">
                          {formatTime(ev.startAt)}
                          {ev.meta && ` · ${ev.meta}`}
                        </p>
                      </div>
                    );
                    return ev.href ? (
                      <Link key={ev.id} href={ev.href} className="block hover:opacity-90 transition-opacity">
                        {content}
                      </Link>
                    ) : (
                      <div key={ev.id}>{content}</div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </BrandCard>
      </section>

      {/* 3. AI To-Do List */}
      <section>
        <BrandSectionHeader
          title="AI To-Do List"
          description="Tasks from Gmail, Calendar, showings, open houses, leads & follow-ups"
        />
        <BrandCard elevated padded>
          <div className="space-y-2">
            {mockAITodos.map((todo) => (
              <AITodoItem key={todo.id} todo={todo} />
            ))}
          </div>
        </BrandCard>
      </section>

      {/* 4. Priority Emails */}
      <section>
        <BrandSectionHeader
          title="Priority Emails"
          description="Designed for Gmail integration"
        />
        <BrandCard elevated padded>
          <div className="space-y-2">
            {mockPriorityEmails.map((email) => (
              <PriorityEmailCard key={email.id} email={email} />
            ))}
          </div>
        </BrandCard>
      </section>

      {/* 5. Recent Activity */}
      <section>
        <BrandSectionHeader
          title="Recent activity"
          description="Latest open house sign-ins and events"
        />
        <BrandCard elevated padded>
          {!stats?.recentOpenHouses?.length ? (
            <BrandEmptyState
              title="No recent activity"
              description="Activity from your showings will appear here."
            />
          ) : (
            <div className="space-y-2">
              {stats.recentOpenHouses.slice(0, 4).map((oh) => (
                <Link
                  key={oh.id}
                  href={`/open-houses/${oh.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--brand-border)] p-3 transition-colors hover:bg-[var(--brand-surface-alt)]"
                >
                  <div>
                    <p className="font-medium text-[var(--brand-text)] text-sm">{oh.title}</p>
                    <p className="text-[var(--brand-text-muted)] text-xs">
                      {oh.property.city} · {oh._count.visitors} visitors
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--brand-text-muted)]" />
                </Link>
              ))}
            </div>
          )}
        </BrandCard>
      </section>

      {/* 6. Quick Actions */}
      <section>
        <BrandSectionHeader title="Quick actions" description="Jump to common tasks" />
        <div className="flex flex-wrap gap-[var(--space-sm)] -mt-[var(--space-sm)]">
          <BrandButton asChild>
            <Link href="/properties/new">
              <Plus className="h-4 w-4 mr-2" />
              Add property
            </Link>
          </BrandButton>
          <BrandButton variant="accent" asChild>
            <Link href="/open-houses/new">
              <Plus className="h-4 w-4 mr-2" />
              New open house
            </Link>
          </BrandButton>
          <BrandButton variant="secondary" asChild>
            <Link href="/open-houses/sign-in">
              <Calendar className="h-4 w-4 mr-2" />
              Open sign-in
            </Link>
          </BrandButton>
        </div>
      </section>

      {/* 7. Modules */}
      <section>
        <BrandSectionHeader
          title="Modules"
          description="Navigate to any KeyPilot module"
        />
        <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4 -mt-[var(--space-sm)]">
          {MODULE_ORDER.filter((id) => id !== "home").map((id) => {
            const mod = MODULES[id];
            return (
              <Link
                key={id}
                href={mod.href}
                className={cn(
                  "flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 transition-all hover:border-[var(--brand-primary)]/30 hover:shadow-[var(--shadow-sm)]",
                  !mod.available && "opacity-70"
                )}
              >
                <span className="font-medium text-[var(--brand-text)]">{mod.name}</span>
                <ChevronRight className="h-4 w-4 text-[var(--brand-text-muted)]" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
