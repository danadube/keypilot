"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import {
  Mail,
  Bell,
  CheckCircle,
  User,
  Check,
  AlertTriangle,
} from "lucide-react";

type Task =
  | {
      id: string;
      type: "draft";
      subject: string;
      status: string;
      leadStatus?: string | null;
      flyerSent?: boolean;
      flyerOpened?: boolean;
      contact: { id: string; firstName: string; lastName: string };
      openHouse: {
        id: string;
        title: string;
        property?: { address1: string };
      };
      updatedAt: string;
    }
  | {
      id: string;
      type: "reminder";
      body: string;
      dueAt: string;
      status: string;
      contact: { id: string; firstName: string; lastName: string };
      createdAt: string;
    };

type FollowUpsData = {
  overdue: Task[];
  needsReply: Task[];
  upcoming: Task[];
  completed: Task[];
};

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const fullName = (c: { firstName: string; lastName: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

function TaskItem({
  task,
  onReminderDone,
  reminderPatchingId,
}: {
  task: Task;
  onReminderDone?: (id: string) => void;
  reminderPatchingId: string | null;
}) {
  if (task.type === "draft") {
    const addr = task.openHouse.property?.address1 ?? task.openHouse.title;
    return (
      <li className="flex flex-col gap-3 rounded-lg border border-kp-outline p-3.5 transition-colors hover:bg-kp-surface-high sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
                {task.flyerSent && "Flyer sent"}
                {task.flyerSent && task.flyerOpened && " · "}
                {task.flyerOpened && "Flyer opened"}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnPrimary, "h-8 text-xs")}
            asChild
          >
            <Link href={`/showing-hq/follow-ups/draft/${task.id}`}>
              Review draft
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 gap-1 text-xs")}
            asChild
          >
            <Link href={`/contacts/${task.contact.id}`}>
              <User className="h-3 w-3" />
              Contact
            </Link>
          </Button>
        </div>
      </li>
    );
  }

  const patching = reminderPatchingId === task.id;
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-kp-outline p-3.5 transition-colors hover:bg-kp-surface-high sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-kp-on-surface">{task.body}</p>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">
          <Link
            href={`/contacts/${task.contact.id}`}
            className="font-medium text-kp-teal hover:underline"
          >
            {fullName(task.contact)}
          </Link>
          {" · "}
          Due {formatDateTime(task.dueAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(kpBtnPrimary, "h-8 gap-1 text-xs")}
          asChild
        >
          <Link href={`/contacts/${task.contact.id}`}>
            Open contact
          </Link>
        </Button>
        {onReminderDone ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "h-8 gap-1 text-xs")}
            disabled={!!reminderPatchingId}
            onClick={() => onReminderDone(task.id)}
          >
            <Check className="h-3.5 w-3.5" />
            {patching ? "Saving…" : "Mark done"}
          </Button>
        ) : null}
      </div>
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
  onReminderDone,
  reminderPatchingId,
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
  onReminderDone?: (id: string) => void;
  reminderPatchingId: string | null;
}) {
  const shown = limit ? tasks.slice(0, limit) : tasks;

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-kp-on-surface-variant">
        {eyebrow}
      </p>
      <h3 className="text-sm font-semibold text-kp-on-surface">{title}</h3>
      <p className="mt-0.5 text-xs text-kp-on-surface-variant">{description}</p>
      <div className="mt-4">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {emptyExtra}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              {icon}
            </div>
            <p className="text-sm font-medium text-kp-on-surface">
              {emptyTitle}
            </p>
            <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
              {emptyDescription}
            </p>
            {emptyAction && <div className="mt-3">{emptyAction}</div>}
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {shown.map((t) => (
                <TaskItem
                  key={`${t.type}-${t.id}`}
                  task={t}
                  onReminderDone={
                    t.type === "reminder" ? onReminderDone : undefined
                  }
                  reminderPatchingId={reminderPatchingId}
                />
              ))}
            </ul>
            {overflow && overflow > 0 ? (
              <p className="mt-3 text-xs text-kp-on-surface-variant">
                Showing {limit} of {tasks.length}
              </p>
            ) : null}
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
  const [reminderPatchingId, setReminderPatchingId] = useState<string | null>(
    null
  );

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/showing-hq/follow-ups")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else
          setData({
            overdue: json.data?.overdue ?? [],
            needsReply: json.data?.needsReply ?? [],
            upcoming: json.data?.upcoming ?? [],
            completed: json.data?.completed ?? [],
          });
      })
      .catch(() => setError("Failed to load follow-ups"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onReminderDone = useCallback(
    async (reminderId: string) => {
      setReminderPatchingId(reminderId);
      try {
        const res = await fetch(`/api/v1/reminders/${reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        load();
      } catch {
        setError("Could not update reminder");
      } finally {
        setReminderPatchingId(null);
      }
    },
    [load]
  );

  if (loading) return <PageLoading message="Loading follow-ups..." />;
  if (error && !data)
    return (
      <ErrorMessage message={error} onRetry={() => { setError(null); load(); }} />
    );

  const overdue = data?.overdue ?? [];
  const needsReply = data?.needsReply ?? [];
  const upcoming = data?.upcoming ?? [];
  const completed = data?.completed ?? [];
  const attentionTotal = overdue.length + needsReply.length;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {attentionTotal > 0 ? (
        <div className="rounded-xl border border-kp-teal/25 bg-kp-teal/[0.07] px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-kp-on-surface">
            What needs attention now
          </p>
          <p className="mt-0.5 text-xs text-kp-on-surface-variant">
            {attentionTotal === 1
              ? "1 item needs your action."
              : `${attentionTotal} items need your action.`}
            {overdue.length > 0
              ? ` ${overdue.length} reminder${overdue.length === 1 ? "" : "s"} overdue.`
              : ""}
          </p>
        </div>
      ) : null}

      {overdue.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-kp-on-surface">
              Overdue follow-ups
            </h2>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              {overdue.length}
            </span>
          </div>
          <ul className="space-y-2.5">
            {overdue.map((t) => (
              <TaskItem
                key={`${t.type}-${t.id}`}
                task={t}
                onReminderDone={onReminderDone}
                reminderPatchingId={reminderPatchingId}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard
          eyebrow="NEEDS REPLY"
          title="Email drafts"
          description="Review, edit, and send — or jump to the contact record."
          icon={<Mail className="h-5 w-5" />}
          emptyTitle="No drafts waiting"
          emptyDescription="After visitors sign in at an open house, drafts land here."
          emptyExtra={
            <div className="mb-4 w-full rounded-lg border border-dashed border-kp-outline bg-kp-surface-high/50 p-4 text-left">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-kp-on-surface-variant">
                Quick loop
              </p>
              <ol className="list-inside list-decimal space-y-1 text-xs text-kp-on-surface-variant">
                <li>Open a draft and send (or tweak first)</li>
                <li>Use Contact to log notes on their record</li>
              </ol>
            </div>
          }
          emptyAction={
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "text-xs")}
              asChild
            >
              <Link href="/open-houses">Open houses</Link>
            </Button>
          }
          tasks={needsReply}
          onReminderDone={onReminderDone}
          reminderPatchingId={reminderPatchingId}
        />

        <SectionCard
          eyebrow="UPCOMING"
          title="Scheduled reminders"
          description="Due soon — open the contact to work the full timeline."
          icon={<Bell className="h-5 w-5" />}
          emptyTitle="Nothing scheduled"
          emptyDescription="Add follow-ups from a contact detail page when you are ready."
          tasks={upcoming}
          onReminderDone={onReminderDone}
          reminderPatchingId={reminderPatchingId}
        />

        <SectionCard
          eyebrow="COMPLETED"
          title="Done"
          description="Sent drafts and completed reminders."
          icon={<CheckCircle className="h-5 w-5" />}
          emptyTitle="Nothing here yet"
          emptyDescription="Completed work will show up for reference."
          tasks={completed}
          limit={10}
          overflow={completed.length > 10 ? completed.length - 10 : 0}
          onReminderDone={undefined}
          reminderPatchingId={reminderPatchingId}
        />
      </div>
    </div>
  );
}
