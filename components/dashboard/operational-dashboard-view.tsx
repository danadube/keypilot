import type { ComponentType } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckSquare,
  Handshake,
  MapPin,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

function PlaceholderMetric({
  label,
  href,
  hint,
  icon: Icon,
}: {
  label: string;
  href: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/40"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-kp-on-surface-muted">
          {label}
        </span>
        <Icon className="h-4 w-4 shrink-0 text-kp-on-surface-muted opacity-80 group-hover:text-kp-teal" />
      </div>
      <p className="font-headline text-2xl font-semibold tabular-nums text-kp-on-surface">—</p>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-kp-on-surface-variant">{hint}</p>
      ) : (
        <p className="mt-2 text-xs text-kp-on-surface-variant">Counts will appear here.</p>
      )}
    </Link>
  );
}

function PipelineCard({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm transition-colors hover:border-kp-teal/25 hover:bg-kp-surface-high/40"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-kp-teal/90" />
        <span className="text-sm font-semibold text-kp-on-surface">{label}</span>
      </div>
      <p className="font-headline text-2xl font-semibold tabular-nums text-kp-on-surface">—</p>
      <span className="mt-2 text-xs text-kp-on-surface-variant group-hover:text-kp-teal">
        Open →
      </span>
    </Link>
  );
}

function ModuleShortcut({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-kp-outline bg-kp-surface-high/30 p-5 shadow-sm transition-colors hover:border-kp-gold/30 hover:bg-kp-surface-high/50"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-kp-outline/80 bg-kp-surface text-kp-gold">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-headline text-base font-semibold text-kp-on-surface">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-kp-on-surface-variant">
        {description}
      </p>
      <span className="mt-3 text-xs font-medium text-kp-teal group-hover:underline">Go to module</span>
    </Link>
  );
}

function QuickActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn(kpBtnSecondary, "h-10 min-h-10 justify-center px-4")}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function OperationalDashboardView() {
  return (
    <div className="space-y-12 pb-8">
      <header className="max-w-3xl">
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-kp-on-surface md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kp-on-surface-variant md:text-[0.9375rem]">
          Your operational home — today&apos;s work, pipeline snapshot, and shortcuts into KeyPilot.
          This is a control center, not analytics.
        </p>
      </header>

      <section aria-labelledby="dash-today">
        <h2
          id="dash-today"
          className="mb-4 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Today
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlaceholderMetric
            label="Showings today"
            href="/showing-hq/showings"
            icon={Calendar}
            hint="Private showings and appointments for today."
          />
          <PlaceholderMetric
            label="Tasks due"
            href="/task-pilot"
            icon={CheckSquare}
            hint="Cross-module tasks with due dates."
          />
          <PlaceholderMetric
            label="Follow-ups due"
            href="/showing-hq/follow-ups"
            icon={MessageSquare}
            hint="Drafts and scheduled follow-ups."
          />
        </div>
      </section>

      <section aria-labelledby="dash-pipeline">
        <h2
          id="dash-pipeline"
          className="mb-4 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Pipeline snapshot
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PipelineCard label="Active deals" href="/transactions/pipeline" icon={Handshake} />
          <PipelineCard label="Active listings" href="/properties" icon={Building2} />
          <PipelineCard label="Contacts needing attention" href="/contacts" icon={Users} />
        </div>
      </section>

      <section aria-labelledby="dash-quick">
        <h2
          id="dash-quick"
          className="mb-4 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <QuickActionLink href="/contacts?new=1">
            <UserPlus className="h-4 w-4" />
            New Contact
          </QuickActionLink>
          <QuickActionLink href="/showing-hq/showings/new">
            <Calendar className="h-4 w-4" />
            New Showing
          </QuickActionLink>
          <QuickActionLink href="/task-pilot">
            <CheckSquare className="h-4 w-4" />
            New Task
          </QuickActionLink>
          <QuickActionLink href="/farm-trackr">
            <MapPin className="h-4 w-4" />
            Import Farm
          </QuickActionLink>
        </div>
      </section>

      <section aria-labelledby="dash-modules">
        <h2
          id="dash-modules"
          className="mb-4 font-headline text-lg font-semibold tracking-tight text-kp-on-surface"
        >
          Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ModuleShortcut
            title="ShowingHQ"
            description="Showings, open houses, visitors, and follow-ups."
            href="/showing-hq"
            icon={Calendar}
          />
          <ModuleShortcut
            title="ClientKeep"
            description="Contacts, segments, tags, and communications."
            href="/contacts"
            icon={Users}
          />
          <ModuleShortcut
            title="FarmTrackr"
            description="Territories, farm areas, imports, and mailing."
            href="/farm-trackr"
            icon={MapPin}
          />
          <ModuleShortcut
            title="PropertyVault"
            description="Listings, media, and property records."
            href="/properties"
            icon={Building2}
          />
        </div>
      </section>
    </div>
  );
}
