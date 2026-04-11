"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { useFarmTrackrStructure } from "@/components/modules/farm-trackr/use-farm-trackr-structure";
import { fetchFarmMailingSummary } from "@/lib/farm/mailing/farm-mailing-browser";
import {
  fetchFarmPerformanceHealth,
  type FarmPerformanceHealthAreaRow,
  type FarmPerformanceHealthPayload,
} from "@/lib/farm/farm-performance-health-browser";
import {
  contactsCleanupHrefAllFarmScope,
  contactsCleanupHrefFromArea,
  contactsCleanupHrefFromTerritory,
} from "@/lib/farm/contacts-cleanup-href";
import { UI_COPY } from "@/lib/ui-copy";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-kp-on-surface-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-kp-on-surface">{value}</p>
      {sub ? <p className="mt-1 text-xs text-kp-on-surface-variant">{sub}</p> : null}
    </div>
  );
}

function gapScore(row: FarmPerformanceHealthAreaRow): number {
  return (
    row.missingEmail +
    row.missingPhone +
    row.missingMailingAddress +
    row.missingSiteAddress
  );
}

function HealthMetricPill({ label, pct }: { label: string; pct: number }) {
  const low = pct < 50;
  return (
    <span
      className={
        low
          ? "rounded-md bg-amber-500/15 px-2 py-0.5 text-amber-100/95"
          : "rounded-md bg-kp-surface-high px-2 py-0.5 text-kp-on-surface-variant"
      }
    >
      {label}{" "}
      <span className="font-semibold tabular-nums text-kp-on-surface">{pct}%</span>
    </span>
  );
}

const cleanupLinkClass = "text-xs font-medium text-kp-teal underline-offset-2 hover:underline";

function FarmAreaHealthCleanupLinks({ row }: { row: FarmPerformanceHealthAreaRow }) {
  if (row.totalContacts === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-kp-outline/50 pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
        Fix in ClientKeep
      </span>
      {row.missingEmail > 0 ? (
        <Link href={contactsCleanupHrefFromArea(row.farmAreaId, { missing: "email" })} className={cleanupLinkClass}>
          Fix missing email
        </Link>
      ) : null}
      {row.missingPhone > 0 ? (
        <Link href={contactsCleanupHrefFromArea(row.farmAreaId, { missing: "phone" })} className={cleanupLinkClass}>
          Fix missing phone
        </Link>
      ) : null}
      {row.missingMailingAddress > 0 ? (
        <Link href={contactsCleanupHrefFromArea(row.farmAreaId, { missing: "mailing" })} className={cleanupLinkClass}>
          Fix mailing data
        </Link>
      ) : null}
      {row.missingSiteAddress > 0 ? (
        <Link href={contactsCleanupHrefFromArea(row.farmAreaId, { missing: "site" })} className={cleanupLinkClass}>
          Fix site data
        </Link>
      ) : null}
      {row.farmStageReadyToPromote > 0 ? (
        <Link
          href={contactsCleanupHrefFromArea(row.farmAreaId, { readyToPromote: true })}
          className={cleanupLinkClass}
        >
          Review ready to promote
        </Link>
      ) : null}
    </div>
  );
}

export function FarmTrackrPerformanceView() {
  const { territories, areas, loading, error, areasByTerritoryId, structureVisibility } =
    useFarmTrackrStructure();
  const [mailTerritory, setMailTerritory] = useState<Record<string, number>>({});
  const [mailLoading, setMailLoading] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const [health, setHealth] = useState<FarmPerformanceHealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskInitialTitle, setTaskInitialTitle] = useState("");
  const [taskInitialDescription, setTaskInitialDescription] = useState("");

  const openFarmTask = useCallback((title: string, description: string) => {
    setTaskInitialTitle(title);
    setTaskInitialDescription(description);
    setTaskModalOpen(true);
  }, []);

  const closeFarmTaskModal = useCallback((open: boolean) => {
    setTaskModalOpen(open);
    if (!open) {
      setTaskInitialTitle("");
      setTaskInitialDescription("");
    }
  }, []);

  const totals = useMemo(() => {
    const territoryCount = territories.length;
    const areaCount = areas.length;
    const assignments = areas.reduce((s, a) => s + a.membershipCount, 0);
    const activeFarms = areas.filter((a) => a.membershipCount > 0).length;
    const emptyFarms = areas.filter((a) => a.membershipCount === 0).length;
    return { territoryCount, areaCount, assignments, activeFarms, emptyFarms };
  }, [territories, areas]);

  const sortedHealthAreas = useMemo(() => {
    if (!health) return [];
    return [...health.areas].sort((a, b) => {
      if (a.totalContacts === 0 && b.totalContacts === 0) {
        return a.farmAreaName.localeCompare(b.farmAreaName);
      }
      if (a.totalContacts === 0) return 1;
      if (b.totalContacts === 0) return -1;
      const d = gapScore(b) - gapScore(a);
      if (d !== 0) return d;
      return a.farmAreaName.localeCompare(b.farmAreaName);
    });
  }, [health]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setMailLoading(true);
    setMailError(null);
    void (async () => {
      try {
        const settled = await Promise.allSettled(
          territories.map(async (t) => {
            const d = await fetchFarmMailingSummary({ territoryId: t.id });
            return { id: t.id, count: d.summary.contactCount };
          })
        );
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const r of settled) {
          if (r.status === "fulfilled") next[r.value.id] = r.value.count;
        }
        setMailTerritory(next);
        if (settled.some((r) => r.status === "rejected")) {
          setMailError("Some mailing-ready totals could not be loaded.");
        }
      } catch (e) {
        if (!cancelled) {
          setMailError(e instanceof Error ? e.message : "Failed to load mailing summaries");
        }
      } finally {
        if (!cancelled) setMailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, territories]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setHealthLoading(true);
    setHealthError(null);
    void (async () => {
      try {
        const data = await fetchFarmPerformanceHealth(structureVisibility);
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) {
          setHealthError(e instanceof Error ? e.message : UI_COPY.errors.load("farm health"));
        }
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, structureVisibility]);

  const mailingReadySum = useMemo(
    () => Object.values(mailTerritory).reduce((s, n) => s + n, 0),
    [mailTerritory]
  );

  const overviewHealthTaskDescription = useMemo(() => {
    if (!health) {
      return "FarmTrackr → Performance & health. Review farm data gaps and mailing readiness.";
    }
    const s = health.summary;
    return [
      "FarmTrackr performance & health (overview)",
      `Territories: ${totals.territoryCount}, farm areas: ${totals.areaCount}, active farms: ${totals.activeFarms}`,
      `Farms with data gaps: ${s.areasNeedingCleanup} of ${s.areasWithContacts}`,
      `Workspace email coverage: ${s.pctWithEmail}%`,
      `Ready to promote (FARM stage): ${s.farmStageReadyToPromote}`,
    ].join("\n");
  }, [health, totals]);

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <p className="max-w-2xl text-xs leading-relaxed text-kp-on-surface-variant">
          {UI_COPY.farmTrackr.performanceBlurb}{" "}
          {UI_COPY.farmTrackr.performanceHealthNote}
        </p>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
        {mailError ? <p className="text-xs text-amber-200/90">{mailError}</p> : null}
        {healthError ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {healthError}
          </div>
        ) : null}

        {!loading ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() =>
                  openFarmTask("FarmTrackr: data health follow-up", overviewHealthTaskDescription)
                }
              >
                <CheckSquare className="h-4 w-4" />
                Add task
              </Button>
            </div>
            {health && !healthLoading ? (
              <div className="flex max-w-3xl flex-col gap-1.5 rounded-lg border border-kp-outline/80 bg-kp-surface-high/20 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">
                  Cleanup (all farms in this view) → ClientKeep
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {health.summary.missingEmail > 0 ? (
                    <Link
                      href={contactsCleanupHrefAllFarmScope(structureVisibility, { missing: "email" })}
                      className={cleanupLinkClass}
                    >
                      Fix missing email
                    </Link>
                  ) : null}
                  {health.summary.missingPhone > 0 ? (
                    <Link
                      href={contactsCleanupHrefAllFarmScope(structureVisibility, { missing: "phone" })}
                      className={cleanupLinkClass}
                    >
                      Fix missing phone
                    </Link>
                  ) : null}
                  {health.summary.missingMailingAddress > 0 ? (
                    <Link
                      href={contactsCleanupHrefAllFarmScope(structureVisibility, { missing: "mailing" })}
                      className={cleanupLinkClass}
                    >
                      Fix mailing data
                    </Link>
                  ) : null}
                  {health.summary.missingSiteAddress > 0 ? (
                    <Link
                      href={contactsCleanupHrefAllFarmScope(structureVisibility, { missing: "site" })}
                      className={cleanupLinkClass}
                    >
                      Fix site data
                    </Link>
                  ) : null}
                  {health.summary.farmStageReadyToPromote > 0 ? (
                    <Link
                      href={contactsCleanupHrefAllFarmScope(structureVisibility, { readyToPromote: true })}
                      className={cleanupLinkClass}
                    >
                      Review ready to promote
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-kp-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            {UI_COPY.farmTrackr.loadingLists}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="Territories" value={totals.territoryCount} />
              <StatCard label="Farm areas" value={totals.areaCount} />
              <StatCard
                label="Active farms"
                value={totals.activeFarms}
                sub="Areas with at least one active membership."
              />
              <StatCard
                label="Empty farms"
                value={totals.emptyFarms}
                sub="Areas with zero members."
              />
              <StatCard
                label="Total members"
                value={totals.assignments}
                sub={UI_COPY.farmTrackr.totalMembersNote}
              />
              <StatCard
                label="Mailing-ready"
                value={
                  mailLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-muted" />
                  ) : (
                    mailingReadySum
                  )
                }
                sub={UI_COPY.farmTrackr.mailingReadySumNote}
              />
              <StatCard
                label="Ready to promote"
                value={
                  healthLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-muted" />
                  ) : (
                    (health?.summary.farmStageReadyToPromote ?? "—")
                  )
                }
                sub="FARM-stage contacts with email or phone (visible in member panel)."
              />
              <StatCard
                label="Farms with gaps"
                value={
                  healthLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-muted" />
                  ) : (
                    (health?.summary.areasNeedingCleanup ?? "—")
                  )
                }
                sub="Areas with at least one missing field among visible contacts."
              />
              <StatCard
                label="Workspace email coverage"
                value={
                  healthLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-muted" />
                  ) : (
                    `${health?.summary.pctWithEmail ?? 0}%`
                  )
                }
                sub="Across all visible farm contacts in the current structure filter."
              />
            </div>

            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">Farm data health</h2>
                <p className="mt-1 text-xs text-kp-on-surface-variant">
                  Sorted with the neediest farms first. Mailing and site use export-ready bars (street +
                  city + state + zip). Email includes alternate fields; phone includes second number.
                </p>
              </div>
              <div className="divide-y divide-kp-outline">
                {healthLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-kp-on-surface-variant">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading health metrics…
                  </div>
                ) : sortedHealthAreas.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-kp-on-surface-variant">
                    No farm areas in this view.{" "}
                    <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                      Create structure on Overview
                    </Link>
                    .
                  </p>
                ) : (
                  sortedHealthAreas.map((row) => (
                    <div key={row.farmAreaId} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-kp-on-surface">{row.farmAreaName}</p>
                          <p className="text-xs text-kp-on-surface-variant">
                            {row.territoryName} ·{" "}
                            <span className="tabular-nums">{row.totalContacts}</span> contacts
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-kp-on-surface-variant underline-offset-2 hover:text-kp-teal hover:underline"
                            onClick={() =>
                              openFarmTask(
                                `Farm health: ${row.farmAreaName}`,
                                [
                                  `Territory: ${row.territoryName}`,
                                  `Contacts: ${row.totalContacts}`,
                                  `Email ${row.pctWithEmail}% · Phone ${row.pctWithPhone}% · Mailing ${row.pctWithMailingAddress}% · Site ${row.pctWithSiteAddress}%`,
                                  `Missing — email: ${row.missingEmail}, phone: ${row.missingPhone}, mailing: ${row.missingMailingAddress}, site: ${row.missingSiteAddress}`,
                                  row.farmStageReadyToPromote > 0
                                    ? `Ready to promote: ${row.farmStageReadyToPromote}`
                                    : null,
                                  `Lists: /farm-trackr/lists?scope=area&id=${row.farmAreaId}`,
                                ]
                                  .filter(Boolean)
                                  .join("\n")
                              )
                            }
                          >
                            Add task
                          </button>
                          <Link
                            href={`/farm-trackr/lists?scope=area&id=${encodeURIComponent(row.farmAreaId)}`}
                            className="text-xs font-medium text-kp-teal hover:underline"
                          >
                            Open lists
                          </Link>
                        </div>
                      </div>
                      {row.totalContacts === 0 ? (
                        <p className="mt-2 text-xs text-kp-on-surface-variant">
                          No visible contacts in this area (or empty farm).
                        </p>
                      ) : (
                        <>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <HealthMetricPill label="Email" pct={row.pctWithEmail} />
                            <HealthMetricPill label="Phone" pct={row.pctWithPhone} />
                            <HealthMetricPill label="Mailing" pct={row.pctWithMailingAddress} />
                            <HealthMetricPill label="Site" pct={row.pctWithSiteAddress} />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-kp-on-surface-variant">
                            <span>
                              Missing email:{" "}
                              <span className="font-medium tabular-nums text-kp-on-surface">
                                {row.missingEmail}
                              </span>
                            </span>
                            <span>
                              Missing phone:{" "}
                              <span className="font-medium tabular-nums text-kp-on-surface">
                                {row.missingPhone}
                              </span>
                            </span>
                            <span>
                              Missing mailing:{" "}
                              <span className="font-medium tabular-nums text-kp-on-surface">
                                {row.missingMailingAddress}
                              </span>
                            </span>
                            <span>
                              Missing site:{" "}
                              <span className="font-medium tabular-nums text-kp-on-surface">
                                {row.missingSiteAddress}
                              </span>
                            </span>
                          </div>
                          {row.farmStageReadyToPromote > 0 ? (
                            <p className="mt-2 text-xs font-medium text-kp-teal/95">
                              {row.farmStageReadyToPromote} contacts ready to promote
                            </p>
                          ) : null}
                          <FarmAreaHealthCleanupLinks row={row} />
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline bg-kp-surface-high/40 px-4 py-3">
                <h2 className="text-sm font-semibold text-kp-on-surface">By territory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-kp-outline text-xs text-kp-on-surface-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Territory</th>
                      <th className="px-4 py-2 font-medium">Farm areas</th>
                      <th className="px-4 py-2 font-medium">Assignments</th>
                      <th className="px-4 py-2 font-medium">Mail-ready</th>
                      <th className="px-4 py-2 font-medium">ClientKeep cleanup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kp-outline text-kp-on-surface">
                    {territories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-xs text-kp-on-surface-variant">
                          No territories yet.{" "}
                          <Link href="/farm-trackr" className="font-medium text-kp-teal hover:underline">
                            Create on Overview
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      territories.map((t) => {
                        const tAreas = areasByTerritoryId.get(t.id) ?? [];
                        const asgn = tAreas.reduce((s, a) => s + a.membershipCount, 0);
                        const mailCell =
                          mailLoading && mailTerritory[t.id] === undefined ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-kp-on-surface-muted" />
                          ) : (
                            <span>{mailTerritory[t.id] ?? "—"}</span>
                          );
                        return (
                          <tr key={t.id}>
                            <td className="px-4 py-2.5 font-medium">{t.name}</td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {tAreas.length}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {asgn}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-kp-on-surface-variant">
                              {mailCell}
                            </td>
                            <td className="max-w-[220px] px-4 py-2 align-top">
                              {asgn === 0 ? (
                                <span className="text-xs text-kp-on-surface-variant">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                                  <Link
                                    href={contactsCleanupHrefFromTerritory(t.id, { missing: "email" })}
                                    className="text-kp-teal hover:underline"
                                  >
                                    Email
                                  </Link>
                                  <Link
                                    href={contactsCleanupHrefFromTerritory(t.id, { missing: "phone" })}
                                    className="text-kp-teal hover:underline"
                                  >
                                    Phone
                                  </Link>
                                  <Link
                                    href={contactsCleanupHrefFromTerritory(t.id, { missing: "mailing" })}
                                    className="text-kp-teal hover:underline"
                                  >
                                    Mailing
                                  </Link>
                                  <Link
                                    href={contactsCleanupHrefFromTerritory(t.id, { missing: "site" })}
                                    className="text-kp-teal hover:underline"
                                  >
                                    Site
                                  </Link>
                                  <Link
                                    href={contactsCleanupHrefFromTerritory(t.id, { readyToPromote: true })}
                                    className="text-kp-teal hover:underline"
                                  >
                                    Promote
                                  </Link>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>

      <NewTaskModal
        open={taskModalOpen}
        onOpenChange={closeFarmTaskModal}
        initialTitle={taskInitialTitle}
        initialDescription={taskInitialDescription}
      />
    </ModuleGate>
  );
}
