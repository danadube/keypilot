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
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">{title}</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">{description}</p>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm text-kp-on-surface-variant">
            Territories, farm areas, imports, and mailing tools live on the overview for now.
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
