"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users, ArrowRight, Flame, GitBranch, Sparkles } from "lucide-react";
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
  icon: Icon,
  children,
  className,
}: {
  title: string;
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
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-kp-gold" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-kp-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-kp-outline/60 bg-kp-bg/50 px-3 py-4 text-center text-sm text-kp-on-surface-muted">
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

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg pt-2 sm:pt-3">
      <div className="mx-6 mb-4 flex flex-col gap-3 sm:mx-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-kp-on-surface-muted">
            Today
          </p>
          <h1 className="text-lg font-semibold text-kp-on-surface">Focus</h1>
          <p className="mt-0.5 max-w-xl text-sm text-kp-on-surface-muted">
            Prioritized people and next steps — not your full database.
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
              Follow-up queue
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
          <Loader2 className="h-7 w-7 animate-spin text-kp-on-surface-variant" aria-label="Loading" />
        </div>
      ) : null}

      {showGrid ? (
        <div className="mx-6 mb-8 grid gap-4 sm:mx-8 lg:grid-cols-12 lg:items-start lg:gap-5">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <FocusSection title="Needs attention" icon={Flame}>
              {data.needsAttention.length === 0 ? (
                <EmptyRow>Nothing overdue or stale — you&apos;re clear.</EmptyRow>
              ) : (
                <ul className="space-y-2">
                  {data.needsAttention.map((row) => (
                    <li key={`${row.kind}:${row.id}`}>
                      <Link
                        href={row.href}
                        className="flex flex-col gap-0.5 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2.5 transition-colors hover:border-kp-gold/40 hover:bg-kp-surface-high/50"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-kp-on-surface">
                            {row.contactName}
                          </span>
                          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </FocusSection>

            <FocusSection title="New or unworked" icon={Sparkles}>
              {data.newOrUnworked.length === 0 ? (
                <EmptyRow>No brand-new imports without a first touch right now.</EmptyRow>
              ) : (
                <ul className="space-y-2">
                  {data.newOrUnworked.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="flex flex-col gap-0.5 rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2.5 transition-colors hover:border-kp-teal/35 hover:bg-kp-surface-high/50"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-kp-on-surface">
                            {row.contactName}
                          </span>
                          <span className="text-[11px] text-kp-on-surface-muted">{row.source}</span>
                        </div>
                        <p className="text-xs text-kp-on-surface-muted">
                          Added {formatFeedActivityTimestamp(row.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </FocusSection>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <FocusSection title="Active pipeline" icon={GitBranch}>
              {data.pipeline.deals.length === 0 &&
              data.pipeline.transactions.length === 0 ? (
                <EmptyRow>No open deals or in-flight transactions tied to your contacts.</EmptyRow>
              ) : (
                <div className="space-y-4">
                  {data.pipeline.deals.length > 0 ? (
                    <div>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                        CRM deals
                      </p>
                      <ul className="space-y-2">
                        {data.pipeline.deals.map((d) => (
                          <li key={d.id}>
                            <Link
                              href={d.href}
                              className="block rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2.5 transition-colors hover:border-kp-gold/40"
                            >
                              <p className="text-sm font-medium text-kp-on-surface">{d.contactName}</p>
                              <p className="text-xs text-kp-on-surface-variant">{d.propertyLabel}</p>
                              <p className="mt-1 text-[11px] text-kp-on-surface-muted">
                                {d.statusLabel}
                              </p>
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
                      <ul className="space-y-2">
                        {data.pipeline.transactions.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={t.href}
                              className="block rounded-xl border border-kp-outline/70 bg-kp-surface-high/30 px-3 py-2.5 transition-colors hover:border-kp-gold/40"
                            >
                              <p className="text-sm font-medium text-kp-on-surface">{t.contactName}</p>
                              <p className="text-xs text-kp-on-surface-variant">{t.propertyLabel}</p>
                              <p className="mt-1 text-[11px] text-kp-on-surface-muted">
                                {t.statusLabel}
                              </p>
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
        </div>
      ) : null}

      <CreateContactModal open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void load()} />
    </div>
  );
}
