"use client";

import Link from "next/link";
import {
  Calendar,
  Camera,
  CheckCircle2,
  Circle,
  FileText,
  ImageIcon,
  LayoutList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_COPY } from "@/lib/ui-copy";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { Button } from "@/components/ui/button";
import { kpBtnPrimary, kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
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

function readinessItems(property: PropertyWorkSurfaceProperty) {
  return [
    {
      key: "photo",
      label: "Key listing photo",
      ok: Boolean(property.imageUrl?.trim()),
      hint: "Used here and on open house sign-in.",
      actionLabel: "Upload photo",
      href: "#property-workspace-hero",
    },
    {
      key: "price",
      label: "Listing price on file",
      ok: property.listingPrice != null && property.listingPrice !== "",
      hint: "Helps flyers, tasks, and deal context.",
      actionLabel: "Edit property",
      href: "#property-identity",
    },
    {
      key: "mls",
      label: "MLS number",
      ok: Boolean(property.mlsNumber?.trim()),
      hint: "Optional but helps marketing alignment.",
      actionLabel: "Edit property",
      href: "#property-identity",
    },
    {
      key: "flyer",
      label: "Marketing flyer",
      ok: Boolean(property.flyerUrl || property.flyerFilename),
      hint: "PDF for visitors and follow-up.",
      actionLabel: "Documents",
      href: `/properties/${property.id}/documents`,
    },
    {
      key: "openHouse",
      label: "Open house on calendar",
      ok: (property.openHouses?.length ?? 0) > 0,
      hint: "Schedule when you are ready to host.",
      actionLabel: "New open house",
      href: "/open-houses/new",
    },
  ];
}

export function PropertyDetailWorkSurface({
  property,
  onFlyerPatch,
}: {
  property: PropertyWorkSurfaceProperty;
  onFlyerPatch: (patch: Partial<PropertyFlyerFields>) => void;
}) {
  const items = readinessItems(property);
  const done = items.filter((i) => i.ok).length;
  const total = items.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

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
              <h2
                id="property-readiness-heading"
                className="text-base font-semibold text-kp-on-surface"
              >
                Listing &amp; marketing readiness
              </h2>
              <p className="mt-0.5 max-w-prose text-[11px] leading-snug text-kp-on-surface-variant">
                Track what still needs attention before this property is fully market-ready. Use the links to
                jump in — the center column is your work surface.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-kp-outline/40 bg-kp-bg/35 px-2.5 py-2" role="status">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface">
              Readiness
            </span>
            <span className="text-xs tabular-nums text-kp-on-surface">
              {done} of {total} complete · {pct}%
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
                <p className="text-[11px] text-kp-on-surface-variant">{item.hint}</p>
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

      <section className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm">
        <div className="flex items-center gap-2 border-b border-kp-outline/35 pb-3">
          <Camera className="h-4 w-4 text-kp-teal" aria-hidden />
          <h2 className="text-sm font-semibold text-kp-on-surface">Media &amp; assets</h2>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-kp-on-surface-variant">
          Photos, tours, and collateral live on dedicated pages — keep the key photo above for sign-in and
          cards.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 text-xs")} asChild>
            <Link href={`/properties/${property.id}/media`}>
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Photos &amp; media
            </Link>
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 text-xs")} asChild>
            <Link href={`/properties/${property.id}/documents`}>
              <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Documents &amp; flyer
            </Link>
          </Button>
        </div>
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
        <p className="mb-3 text-[11px] text-kp-on-surface-variant">Events hosted at this address</p>
        {!property.openHouses?.length ? (
          <p className="mb-3 text-sm text-kp-on-surface-variant">{UI_COPY.empty.noneYet("open houses")}</p>
        ) : (
          <ul className="mb-3 divide-y divide-kp-outline">
            {property.openHouses.map((oh) => (
              <li key={oh.id} className="flex items-center justify-between py-2.5">
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
        <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")} asChild>
          <Link href="/open-houses/new">New open house</Link>
        </Button>
      </section>

      <section className="rounded-xl border border-dashed border-kp-outline/50 bg-kp-bg/20 px-3 py-2.5">
        <p className="text-[11px] leading-snug text-kp-on-surface-variant">
          <span className="font-medium text-kp-on-surface">Showing support.</span> Visitor feedback and seller
          reports stay in the right column. Connect clients in ClientKeep and deals in TransactionHQ from the
          links there.
        </p>
      </section>
    </div>
  );
}
