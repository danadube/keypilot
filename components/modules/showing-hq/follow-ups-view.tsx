"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";
import { Button } from "@/components/ui/button";
import { Mail, Bell, CheckCircle } from "lucide-react";

type Task =
  | { id: string; type: "draft"; subject: string; status: string; leadStatus?: string | null; flyerSent?: boolean; flyerOpened?: boolean; contact: { id: string; firstName: string; lastName: string }; openHouse: { id: string; title: string; property?: { address1: string } }; updatedAt: string }
  | { id: string; type: "reminder"; body: string; dueAt: string; status: string; contact: { id: string; firstName: string; lastName: string }; createdAt: string };

type FollowUpsData = {
  needsReply: Task[];
  upcoming: Task[];
  completed: Task[];
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const fullName = (c: { firstName: string; lastName: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

function TaskItem({ task }: { task: Task }) {
  if (task.type === "draft") {
    const addr = task.openHouse.property?.address1 ?? task.openHouse.title;
    return (
      <li className="flex items-center justify-between gap-4 rounded-lg border border-kp-outline p-3.5 transition-colors hover:bg-kp-surface-high">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-kp-on-surface">{task.subject}</p>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">
            {fullName(task.contact)} · {addr}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <FollowUpStatusBadge status={task.status} className="text-xs" />
            {"leadStatus" in task && task.leadStatus && (
              <LeadStatusBadge status={task.leadStatus} />
            )}
            {"flyerSent" in task && (task.flyerSent || task.flyerOpened) && (
              <span className="text-xs text-kp-on-surface-variant">
                {task.flyerSent && "Flyer sent ✓"}
                {task.flyerSent && task.flyerOpened && " · "}
                {task.flyerOpened && "Flyer opened ✓"}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
          asChild
        >
          <Link href={`/showing-hq/follow-ups/draft/${task.id}`}>Review</Link>
        </Button>
      </li>
    );
  }
  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-kp-outline p-3.5 transition-colors hover:bg-kp-surface-high">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-kp-on-surface">{task.body}</p>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">
          {fullName(task.contact)} · Due {formatDateTime(task.dueAt)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 shrink-0 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
        asChild
      >
        <Link href={`/contacts/${task.contact.id}`}>View contact</Link>
      </Button>
    </li>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyExtra,
  tasks,
  limit,
  overflow,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  emptyExtra?: React.ReactNode;
  tasks: Task[];
  limit?: number;
  overflow?: number;
}) {
  const shown = limit ? tasks.slice(0, limit) : tasks;
  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-kp-on-surface-variant">{eyebrow}</p>
      <h3 className="text-sm font-semibold text-kp-on-surface">{title}</h3>
      <p className="mt-0.5 text-xs text-kp-on-surface-variant">{description}</p>
      <div className="mt-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {emptyExtra}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              {icon}
            </div>
            <p className="text-sm font-medium text-kp-on-surface">{emptyTitle}</p>
            <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">{emptyDescription}</p>
            {emptyAction && <div className="mt-3">{emptyAction}</div>}
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {shown.map((t) => (
                <TaskItem key={`${t.type}-${t.id}`} task={t} />
              ))}
            </ul>
            {overflow && overflow > 0 && (
              <p className="mt-3 text-xs text-kp-on-surface-variant">
                Showing {limit} of {tasks.length}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function FollowUpsView() {
  const [data, setData] = useState<FollowUpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/showing-hq/follow-ups")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load follow-ups"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading follow-ups..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const needsReply = data?.needsReply ?? [];
  const upcoming = data?.upcoming ?? [];
  const completed = data?.completed ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          eyebrow="NEEDS REPLY"
          title="Needs reply"
          description="Email drafts awaiting review or send"
          icon={<Mail className="h-5 w-5" />}
          emptyTitle="No drafts yet"
          emptyDescription="After visitors sign in at your open house, we'll generate follow-up drafts here for you to review and send."
          emptyExtra={
            <div className="mb-4 w-full rounded-lg border border-dashed border-kp-outline bg-kp-surface-high/50 p-4 text-left">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-variant">
                How it works
              </p>
              <ol className="list-inside list-decimal space-y-1 text-xs text-kp-on-surface-variant">
                <li>Visitors sign in at your open house</li>
                <li>We generate personalized follow-up drafts</li>
                <li>Review, edit, and send with one click</li>
              </ol>
            </div>
          }
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className="border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <Link href="/open-houses">View open houses</Link>
            </Button>
          }
          tasks={needsReply}
        />

        <SectionCard
          eyebrow="UPCOMING"
          title="Upcoming"
          description="Call and follow-up reminders"
          icon={<Bell className="h-5 w-5" />}
          emptyTitle="No reminders"
          emptyDescription="Call and follow-up reminders will appear here when scheduled."
          tasks={upcoming}
        />

        <SectionCard
          eyebrow="COMPLETED"
          title="Completed"
          description="Sent follow-ups and done reminders"
          icon={<CheckCircle className="h-5 w-5" />}
          emptyTitle="Nothing completed yet"
          emptyDescription="Completed follow-ups and sent emails will appear here."
          tasks={completed}
          limit={10}
          overflow={completed.length > 10 ? completed.length - 10 : 0}
        />
      </div>
    </div>
  );
}
