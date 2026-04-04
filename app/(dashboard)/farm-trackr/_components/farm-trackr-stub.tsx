"use client";

import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";

export function FarmTrackrStubPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-kp-on-surface-muted">
            {title}
          </p>
          <p className="text-xs text-kp-on-surface-variant">{description}</p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-xs text-kp-on-surface-variant">
            Territories, imports, and mailing tools are on Overview for now.
          </p>
          <Link
            href="/farm-trackr"
            className="mt-3 inline-flex text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            Go to FarmTrackr overview
          </Link>
        </div>
      </div>
    </ModuleGate>
  );
}
