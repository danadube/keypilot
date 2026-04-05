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
    "Directional product roadmap for KeyPilot — modules, integrations, and platform investments.",
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

function statusChipClass(status: RoadmapStatus): string {
  switch (status) {
    case "planned":
      return "border-slate-500/35 bg-slate-500/[0.12] text-slate-300";
    case "in_progress":
      return "border-[color:var(--roadmap-gold)]/45 bg-[color:var(--roadmap-gold)]/12 text-[color:var(--roadmap-gold)]";
    case "beta":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200/95";
    case "live":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    default:
      return "";
  }
}

function RoadmapCard({ item }: { item: RoadmapItemConfig }) {
  const Icon = ROADMAP_ICONS[item.icon];
  return (
    <article
      className={cn(
        "group flex h-full flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors",
        "hover:border-[color:var(--roadmap-gold)]/25 hover:bg-kp-surface-high/30"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-kp-outline/80 bg-kp-surface-high/50 text-[color:var(--roadmap-gold)] transition-colors group-hover:border-[color:var(--roadmap-gold)]/30"
          aria-hidden
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span
            className="rounded-md border border-kp-outline/90 bg-kp-bg/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted"
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
      className="space-y-12 pb-8"
      style={{ ["--roadmap-gold" as string]: GOLD } as CSSProperties}
    >
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-kp-outline/90 bg-gradient-to-br from-kp-surface-high/50 via-kp-bg to-kp-surface px-6 py-10 sm:px-10 sm:py-12"
        aria-labelledby="roadmap-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-90 blur-3xl"
          style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)` }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#F4BD6A]/40 to-transparent"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-kp-on-surface-muted"
            style={{ color: `${GOLD}cc` }}
          >
            Product direction
          </p>
          <h1
            id="roadmap-hero-title"
            className="font-headline text-3xl font-semibold tracking-tight text-kp-on-surface sm:text-4xl"
          >
            KeyPilot{" "}
            <span className="text-[color:var(--roadmap-gold)]">Roadmap</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-kp-on-surface-variant sm:text-base">
            A living view of what we are shipping across ShowingHQ, ClientKeep, PropertyVault,
            FarmTrackr, transactions, and the shared KeyPilot platform — integrations, automation,
            and the workflows agents rely on every day.
          </p>
        </div>
      </section>

      {/* Categories + grid */}
      <div className="space-y-14">
        {KEYPILOT_ROADMAP_CATEGORIES.map((category) => (
          <section key={category.id} aria-labelledby={`roadmap-cat-${category.id}`}>
            <div className="mb-6 border-l-2 border-[color:var(--roadmap-gold)]/50 pl-4">
              <h2
                id={`roadmap-cat-${category.id}`}
                className="font-headline text-xl font-semibold text-kp-on-surface"
              >
                {category.title}
              </h2>
              {category.description ? (
                <p className="mt-1.5 max-w-3xl text-sm text-kp-on-surface-variant">
                  {category.description}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {category.items.map((item) => (
                <RoadmapCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* About */}
      <section
        className="rounded-2xl border border-kp-outline bg-kp-surface-high/25 px-6 py-8 sm:px-8"
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
