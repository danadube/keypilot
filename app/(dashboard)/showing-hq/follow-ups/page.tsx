"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Badge } from "@/components/ui/badge";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Mail, Bell, CheckCircle } from "lucide-react";

type Task =
  | { id: string; type: "draft"; subject: string; status: string; leadStatus?: string | null; contact: { id: string; firstName: string; lastName: string }; openHouse: { id: string; title: string }; updatedAt: string }
  | { id: string; type: "reminder"; body: string; dueAt: string; status: string; contact: { id: string; firstName: string; lastName: string }; createdAt: string };

type FollowUpsData = {
  needsReply: Task[];
  upcoming: Task[];
  completed: Task[];
};

export default function ShowingHQFollowUpsPage() {
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

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const fullName = (c: { firstName: string; lastName: string }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

  const TaskItem = ({ task }: { task: Task }) => {
    if (task.type === "draft") {
      return (
        <li className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4">
          <div>
            <p className="font-medium text-[var(--brand-text)]">{task.subject}</p>
            <p className="text-sm text-[var(--brand-text-muted)]">
              {fullName(task.contact)} · {task.openHouse.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={task.status === "REVIEWED" ? "default" : "secondary"} className="text-xs">
                {task.status}
              </Badge>
              {"leadStatus" in task && <LeadStatusBadge status={task.leadStatus} />}
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/open-houses/${task.openHouse.id}/follow-ups`}>View</Link>
          </Button>
        </li>
      );
    }
    return (
      <li className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-4">
        <div>
          <p className="font-medium text-[var(--brand-text)]">{task.body}</p>
          <p className="text-sm text-[var(--brand-text-muted)]">
            {fullName(task.contact)} · Due {formatDateTime(task.dueAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/contacts/${task.contact.id}`}>View contact</Link>
        </Button>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="Follow-ups"
        description="AI suggested tasks, email follow-ups, and call reminders."
      />

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-3">
        <BrandCard elevated padded>
          <BrandSectionHeader
            eyebrow="NEEDS REPLY"
            title="Needs reply"
            description="Email drafts awaiting review or send"
          />
          <div className="mt-4">
            {needsReply.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30 p-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                    How it works
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-[var(--brand-text-muted)]">
                    <li>Visitors sign in at your open house</li>
                    <li>We generate personalized follow-up drafts</li>
                    <li>Review, edit, and send with one click</li>
                  </ol>
                </div>
                <BrandEmptyState
                  compact
                  variant="premium"
                  icon={<Mail className="h-6 w-6" />}
                  title="No drafts yet"
                  description="After visitors sign in at your open house, we'll generate follow-up drafts here for you to review and send."
                  action={
                    <BrandButton variant="secondary" size="sm" asChild>
                      <Link href="/open-houses">View open houses</Link>
                    </BrandButton>
                  }
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {needsReply.map((t) => (
                  <TaskItem key={`${t.type}-${t.id}`} task={t} />
                ))}
              </ul>
            )}
          </div>
        </BrandCard>

        <BrandCard elevated padded>
          <BrandSectionHeader
            eyebrow="UPCOMING"
            title="Upcoming"
            description="Call and follow-up reminders"
          />
          <div className="mt-4">
            {upcoming.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Bell className="h-6 w-6" />}
                title="No reminders"
                description="Call and follow-up reminders will appear here when scheduled."
              />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((t) => (
                  <TaskItem key={`${t.type}-${t.id}`} task={t} />
                ))}
              </ul>
            )}
          </div>
        </BrandCard>

        <BrandCard elevated padded>
          <BrandSectionHeader
            eyebrow="COMPLETED"
            title="Completed"
            description="Sent follow-ups and done reminders"
          />
          <div className="mt-4">
            {completed.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<CheckCircle className="h-6 w-6" />}
                title="Nothing completed yet"
                description="Completed follow-ups and sent emails will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {completed.slice(0, 10).map((t) => (
                  <TaskItem key={`${t.type}-${t.id}`} task={t} />
                ))}
              </ul>
            )}
            {completed.length > 10 && (
              <p className="mt-3 text-sm text-[var(--brand-text-muted)]">
                Showing 10 of {completed.length}
              </p>
            )}
          </div>
        </BrandCard>
      </div>
    </div>
  );
}
