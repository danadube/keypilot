"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  Users,
  ArrowRight,
  Flame,
  GitBranch,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { UI_COPY } from "@/lib/ui-copy";
import { formatFeedActivityTimestamp } from "@/lib/activity/format-feed-activity-timestamp";
import { CreateContactModal } from "@/components/modules/contacts/create-contact-modal";
import type { ClientKeepFocusResponse } from "@/lib/validations/client-keep-focus";

function kindLabel(kind: ClientKeepFocusResponse["needsAttention"][number]["kind"]): string {
  switch (kind) {
    case "reminder":
      return "Reminder";
    case "follow_up_task":
      return "Follow-up";
    case "draft":
      return "Draft";
    case "stale_contact":
      return "Stale";
    default:
      return "Action";
  }
}

function FocusSection({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-kp-outline/80 bg-kp-surface/40 px-4 py-3 shadow-sm sm:px-5 sm:py-4",
        className
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

export function ClientKeepFocusView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ClientKeepFocusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/client-keep/focus");
      const json = await res.json();
      if (!res.ok) {
        setError((json.error?.message as string) ?? UI_COPY.errors.load("contacts"));
        setData(null);
        return;
      }
      setData(json.data as ClientKeepFocusResponse);
    } catch {
      setError(UI_COPY.errors.load("contacts"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setCreateOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("new");
    const q = next.toString();
    router.replace(q ? `/contacts?${q}` : "/contacts", { scroll: false });
  }, [searchParams, router]);

  const showSkeleton = loading && !data;
  const showGrid = !loading && !error && data != null;

  const isCaughtUp =
    data != null &&
    data.needsAttention.length === 0 &&
    data.newOrUnworked.length === 0 &&
    data.pipeline.deals.length === 0 &&
    data.pipeline.transactions.length === 0;

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pt-2 sm:pt-3">
      <div className="mx-6 mb-4 flex flex-col gap-3 sm:mx-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-kp-on-surface-muted">
            Today
          </p>
          <h1 className="text-lg font-semibold text-kp-on-surface">Focus</h1>
          <p className="mt-0.5 max-w-xl text-sm text-kp-on-surface-muted">
            Who to touch next — not your full list.{" "}
            <span className="text-kp-on-surface-variant/90">Start in Needs attention, then new contacts.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
            <Link href="/contacts/all">
              <Users className="mr-1.5 h-4 w-4" aria-hidden />
              All contacts
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
            <Link href="/client-keep/follow-ups">
              Follow-ups
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mx-6 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 sm:mx-8">
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="mx-6 flex min-h-[240px] items-center justify-center sm:mx-8">
          <Loader2
            className="h-7 w-7 animate-spin text-kp-on-surface-variant"
            aria-label="Loading focus"
          />
        </div>
      ) : null}

      {showGrid ? (
        <div className="mx-6 mb-8 grid gap-4 sm:mx-8 lg:grid-cols-12 lg:items-start lg:gap-5">
          {isCaughtUp ? (
            <div className="lg:col-span-12">
              <div className="flex flex-col gap-2 rounded-2xl border border-kp-teal/25 bg-kp-teal/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm text-kp-on-surface">
                  <span className="font-medium text-kp-on-surface">You&apos;re caught up.</span>{" "}
                  <span className="text-kp-on-surface-muted">
                    Add a client, browse everyone, or check the follow-up list.
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
                    <Link href="/contacts?new=1">Add client</Link>
                  </Button>
                  <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
                    <Link href="/contacts/all">All contacts</Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
          <div className="flex flex-col gap-4 lg:col-span-7">
            <FocusSection
              title="Needs attention"
              description="Overdue reminders and follow-ups, open drafts, or contacts gone quiet."
              icon={Flame}
            >
              {data.needsAttention.length === 0 ? (
                <EmptyRow>
                  Nothing urgent here — check{" "}
                  <Link href="/contacts/all" className="font-medium text-kp-gold underline-offset-2 hover:underline">
                    all contacts
                  </Link>{" "}
                  if you&apos;re looking for someone.
                </EmptyRow>
              ) : (
                <ul className="space-y-1.5">
                  {data.needsAttention.map((row) => (
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
                              {kindLabel(row.kind)}
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
            </FocusSection>

            <FocusSection
              title="New or unworked"
              description="Recently added with no activity logged yet — say hello or file a note."
              icon={Sparkles}
            >
              {data.newOrUnworked.length === 0 ? (
                <EmptyRow>No new contacts waiting for a first touch.</EmptyRow>
              ) : (
                <ul className="space-y-1.5">
                  {data.newOrUnworked.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-teal/35 hover:bg-kp-surface-high/50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-kp-on-surface">
                              {row.contactName}
                            </span>
                            <span className="text-[11px] text-kp-on-surface-muted">{row.source}</span>
                          </div>
                          <p className="text-xs text-kp-on-surface-muted">
                            Added {formatFeedActivityTimestamp(row.createdAt)}
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
            </FocusSection>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <FocusSection
              title="Active pipeline"
              description="Deals and transactions linked to people you work with."
              icon={GitBranch}
            >
              {data.pipeline.deals.length === 0 &&
              data.pipeline.transactions.length === 0 ? (
                <EmptyRow>No open deals or in-progress transactions on your contacts.</EmptyRow>
              ) : (
                <div className="space-y-3">
                  {data.pipeline.deals.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                        Deals
                      </p>
                      <ul className="space-y-1.5">
                        {data.pipeline.deals.map((d) => (
                          <li key={d.id}>
                            <Link
                              href={d.href}
                              className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-gold/40 hover:bg-kp-surface-high/40"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-kp-on-surface">{d.contactName}</p>
                                <p className="text-xs text-kp-on-surface-variant">{d.propertyLabel}</p>
                                <p className="mt-0.5 text-[11px] text-kp-on-surface-muted">{d.statusLabel}</p>
                              </div>
                              <ChevronRight
                                className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60 transition-opacity group-hover:opacity-100"
                                aria-hidden
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {data.pipeline.transactions.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                        Transactions
                      </p>
                      <ul className="space-y-1.5">
                        {data.pipeline.transactions.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={t.href}
                              className="group flex gap-2 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2 transition-colors hover:border-kp-gold/40 hover:bg-kp-surface-high/40"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-kp-on-surface">{t.contactName}</p>
                                <p className="text-xs text-kp-on-surface-variant">{t.propertyLabel}</p>
                                <p className="mt-0.5 text-[11px] text-kp-on-surface-muted">{t.statusLabel}</p>
                              </div>
                              <ChevronRight
                                className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-60 transition-opacity group-hover:opacity-100"
                                aria-hidden
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </FocusSection>
          </div>
            </>
          )}
        </div>
      ) : null}

      <CreateContactModal open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
    </div>
  );
}
