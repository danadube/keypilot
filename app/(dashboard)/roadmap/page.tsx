import type { CSSProperties } from "react";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calendar,
  CheckSquare,
  Cloud,
  Contact,
  FileSignature,
  GitBranch,
  Import,
  LayoutGrid,
  Mail,
  Megaphone,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  KEYPILOT_ROADMAP_CATEGORIES,
  ROADMAP_ABOUT_COPY,
  type RoadmapIconKey,
  type RoadmapItemConfig,
  type RoadmapStatus,
} from "@/lib/roadmap/keypilot-roadmap-data";

export const metadata: Metadata = {
  title: "Roadmap | KeyPilot",
  description:
    "How KeyPilot is investing in listings, relationships, deals, and platform trust — with clear Now, Preview, and horizon milestones.",
};

/** Aurelian Gold — primary accent for this page (per brand direction). */
const GOLD = "#F4BD6A";

const ROADMAP_ICONS: Record<RoadmapIconKey, LucideIcon> = {
  LayoutGrid,
  Mail,
  Calendar,
  Contact,
  Cloud,
  Building2,
  GitBranch,
  FileSignature,
  Megaphone,
  CheckSquare,
  Smartphone,
  Palette,
  Shield,
  Import,
  Sparkles,
  Wallet,
};

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  beta: "Beta",
  live: "Live",
};

/** Status chip — muted, scannable; avoid loud green. */
function statusChipClass(status: RoadmapStatus): string {
  switch (status) {
    case "planned":
      return "border-zinc-500/30 bg-zinc-500/[0.10] text-zinc-400";
    case "in_progress":
      return "border-[color:var(--roadmap-gold)]/40 bg-[color:var(--roadmap-gold)]/[0.09] text-[color:var(--roadmap-gold)]";
    case "beta":
      return "border-slate-400/25 bg-slate-500/10 text-slate-300";
    case "live":
      return "border-stone-400/30 bg-stone-400/[0.08] text-stone-300";
    default:
      return "";
  }
}

/** Subtle left rail + background tint so status scans without shouting. */
function cardStatusShellClass(status: RoadmapStatus): string {
  switch (status) {
    case "planned":
      return "border-l-[3px] border-l-zinc-500/35 bg-kp-surface/80";
    case "in_progress":
      return "border-l-[3px] border-l-[color:var(--roadmap-gold)]/50 bg-[color:var(--roadmap-gold)]/[0.03]";
    case "beta":
      return "border-l-[3px] border-l-slate-400/30 bg-kp-surface-high/20";
    case "live":
      return "border-l-[3px] border-l-stone-500/30 bg-stone-500/[0.04]";
    default:
      return "";
  }
}

function RoadmapCard({ item }: { item: RoadmapItemConfig }) {
  const Icon = ROADMAP_ICONS[item.icon];
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-kp-outline py-4 pl-[calc(1rem+3px)] pr-4 shadow-sm transition-colors",
        cardStatusShellClass(item.status),
        "hover:border-kp-outline/90 hover:bg-kp-surface-high/25"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-kp-surface-high/40 transition-colors",
            "border-kp-outline/70 text-[color:var(--roadmap-gold)]/90",
            "group-hover:border-[color:var(--roadmap-gold)]/25"
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span
            className="rounded-md border border-kp-outline/80 bg-kp-bg/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted"
            title="Target milestone"
          >
            {item.milestone}
          </span>
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              statusChipClass(item.status)
            )}
          >
            {STATUS_LABEL[item.status]}
          </span>
        </div>
      </div>
      <h3 className="font-headline text-base font-semibold tracking-tight text-kp-on-surface">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-kp-on-surface-variant">
        {item.description}
      </p>
    </article>
  );
}

export default function RoadmapPage() {
  return (
    <div
      className="space-y-16 pb-10 md:space-y-20"
      style={{ ["--roadmap-gold" as string]: GOLD } as CSSProperties}
    >
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-kp-outline/90 bg-gradient-to-br from-kp-surface-high/45 via-kp-bg to-kp-surface px-6 py-10 sm:px-10 sm:py-12"
        aria-labelledby="roadmap-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-90 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}1a 0%, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#F4BD6A]/35 to-transparent"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: `${GOLD}b3` }}
          >
            Platform direction
          </p>
          <h1
            id="roadmap-hero-title"
            className="font-headline text-3xl font-semibold tracking-tight text-kp-on-surface sm:text-[2.125rem] sm:leading-tight"
          >
            One operating layer for{" "}
            <span className="text-[color:var(--roadmap-gold)]">listings, relationships, and deals</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-kp-on-surface-variant sm:text-[0.9375rem]">
            KeyPilot connects showings, CRM, property records, farms, and transactions. This roadmap
            shows what is shipping now, what is in preview, and what we are building next — so you can
            plan alongside us.
          </p>
        </div>
      </section>

      {/* Categories + grid */}
      <div className="space-y-0">
        {KEYPILOT_ROADMAP_CATEGORIES.map((category, catIdx) => (
          <section
            key={category.id}
            aria-labelledby={`roadmap-cat-${category.id}`}
            className={cn(
              catIdx > 0 && "mt-16 border-t border-kp-outline/50 pt-16 md:mt-20 md:pt-20"
            )}
          >
            <div className="mb-7 border-l-2 border-[color:var(--roadmap-gold)]/45 pl-4 md:mb-8">
              <h2
                id={`roadmap-cat-${category.id}`}
                className="font-headline text-xl font-semibold tracking-tight text-kp-on-surface md:text-[1.35rem]"
              >
                {category.title}
              </h2>
              {category.description ? (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-kp-on-surface-variant">
                  {category.description}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {category.items.map((item) => (
                <RoadmapCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* About */}
      <section
        className="rounded-2xl border border-kp-outline bg-kp-surface-high/20 px-6 py-8 sm:px-8 sm:py-9"
        aria-labelledby="roadmap-about-title"
      >
        <h2
          id="roadmap-about-title"
          className="font-headline text-lg font-semibold text-kp-on-surface"
        >
          {ROADMAP_ABOUT_COPY.title}
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-kp-on-surface-variant">
          {ROADMAP_ABOUT_COPY.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
