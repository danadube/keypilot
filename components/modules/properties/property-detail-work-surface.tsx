"use client";

import Link from "next/link";
import { Calendar, CheckCircle2, Circle, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_COPY } from "@/lib/ui-copy";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { Button } from "@/components/ui/button";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { PropertyFlyerPanel, type PropertyFlyerFields } from "./property-flyer-panel";

type OpenHouseRow = { id: string; title: string; startAt: string };

export type PropertyWorkSurfaceProperty = {
  id: string;
  imageUrl?: string | null;
  listingPrice?: string | number | null;
  mlsNumber?: string | null;
  flyerUrl?: string | null;
  flyerFilename?: string | null;
  flyerUploadedAt?: string | null;
  flyerEnabled?: boolean | null;
  openHouses?: OpenHouseRow[];
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readinessRows(
  property: PropertyWorkSurfaceProperty,
  hasPrimaryClient: boolean,
  linkClientHref: string
) {
  return [
    {
      key: "client",
      label: "Primary client",
      ok: hasPrimaryClient,
      actionLabel: "Link",
      href: linkClientHref,
    },
    {
      key: "photo",
      label: "Key photo",
      ok: Boolean(property.imageUrl?.trim()),
      actionLabel: "Upload",
      href: "#property-workspace-hero",
    },
    {
      key: "price",
      label: "Listing price",
      ok: property.listingPrice != null && property.listingPrice !== "",
      actionLabel: "Edit",
      href: "#property-identity",
    },
    {
      key: "mls",
      label: "MLS #",
      ok: Boolean(property.mlsNumber?.trim()),
      actionLabel: "Edit",
      href: "#property-identity",
    },
    {
      key: "flyer",
      label: "Flyer / PDF",
      ok: Boolean(property.flyerUrl || property.flyerFilename),
      actionLabel: "Documents",
      href: `/properties/${property.id}/documents`,
    },
    {
      key: "openHouse",
      label: "Open house scheduled",
      ok: (property.openHouses?.length ?? 0) > 0,
      actionLabel: "Schedule",
      href: "/open-houses/new",
    },
  ];
}

export function PropertyDetailWorkSurface({
  property,
  onFlyerPatch,
  hasPrimaryClient,
  linkClientHref,
}: {
  property: PropertyWorkSurfaceProperty;
  onFlyerPatch: (patch: Partial<PropertyFlyerFields>) => void;
  hasPrimaryClient: boolean;
  linkClientHref: string;
}) {
  const items = readinessRows(property, hasPrimaryClient, linkClientHref);
  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const listingReady = hasPrimaryClient && done === total;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section
        className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm"
        aria-labelledby="property-readiness-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-kp-outline/35 pb-3">
          <div className="flex min-w-0 items-start gap-2">
            <LayoutList className="mt-0.5 h-5 w-5 shrink-0 text-kp-teal" aria-hidden />
            <div>
              <h2 id="property-readiness-heading" className="text-base font-semibold text-kp-on-surface">
                Listing readiness
              </h2>
              <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
                {listingReady ? "All checks complete." : "Resolve each row to clear the pipeline."}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-kp-outline/40 bg-kp-bg/35 px-2.5 py-2" role="status">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">Progress</span>
            <span className="text-xs tabular-nums text-kp-on-surface">
              {done}/{total} · {pct}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-kp-surface-high/90">
            <div
              className="h-full rounded-full bg-kp-teal/90 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-2 rounded-lg border border-kp-outline/35 bg-kp-surface-high/20 px-2.5 py-2"
            >
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-muted" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-kp-on-surface">{item.label}</p>
              </div>
              {!item.ok ? (
                item.href.startsWith("#") ? (
                  <a
                    href={item.href}
                    className="shrink-0 text-xs font-semibold text-kp-teal underline-offset-2 hover:underline"
                  >
                    {item.actionLabel}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    className="shrink-0 text-xs font-semibold text-kp-teal underline-offset-2 hover:underline"
                  >
                    {item.actionLabel}
                  </Link>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <PropertyFlyerPanel
        propertyId={property.id}
        flyer={{
          flyerUrl: property.flyerUrl,
          flyerFilename: property.flyerFilename,
          flyerUploadedAt: property.flyerUploadedAt,
          flyerEnabled: property.flyerEnabled,
        }}
        onFlyerPatch={onFlyerPatch}
      />

      <section className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-kp-teal" aria-hidden />
          <h2 className="text-sm font-semibold text-kp-on-surface">Open houses</h2>
        </div>
        {!property.openHouses?.length ? (
          <p className="text-sm text-kp-on-surface-variant">{UI_COPY.empty.noneYet("open houses")}</p>
        ) : (
          <ul className="divide-y divide-kp-outline">
            {property.openHouses.map((oh) => (
              <li key={oh.id} className="flex items-center justify-between py-2.5 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-kp-on-surface">{oh.title}</p>
                  <p className="text-xs text-kp-on-surface-variant">{formatDate(oh.startAt)}</p>
                </div>
                <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "h-7 text-xs")} asChild>
                  <Link href={showingHqOpenHouseWorkspaceHref(oh.id)}>View</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
