"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Lock, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { getUpgradeConfig } from "@/lib/upgrade-modules";
import { isUpgradeModule } from "@/lib/module-access";
import type { ModuleId } from "@/lib/modules";

export default function UpgradeModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as ModuleId;
  const config = getUpgradeConfig(moduleId);

  if (!config || !isUpgradeModule(moduleId)) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">Module not found</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            This upgrade module doesn&apos;t exist or isn&apos;t available.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(kpBtnSecondary, "w-fit")}
          asChild
        >
          <Link href="/showing-hq">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to ShowingHQ
          </Link>
        </Button>
      </div>
    );
  }

  const ctaLabel = config.ctaLabel ?? "Upgrade to unlock";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">
            {config.displayName ?? config.name}
          </h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">{config.description}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className={cn(kpBtnPrimary, "h-8 border-transparent px-4 text-xs")}
          asChild
        >
          <Link href="/settings/modules">{ctaLabel}</Link>
        </Button>
      </div>

      {/* Content card */}
      <div className="max-w-2xl rounded-xl border border-kp-outline bg-kp-surface p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-kp-teal/10">
            <Lock className="h-7 w-7 text-kp-teal" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-lg font-semibold text-kp-on-surface">{config.headline}</h2>
            <p className="mb-6 text-sm text-kp-on-surface-variant">{config.description}</p>

            {config.recommendedFor && (
              <div className="mb-6 rounded-lg border border-kp-outline bg-kp-surface-high p-4">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-kp-teal">
                  Works with ShowingHQ
                </h3>
                <p className="text-sm text-kp-on-surface-variant">{config.recommendedFor}</p>
              </div>
            )}

            <h3 className="mb-3 text-sm font-semibold text-kp-on-surface">Benefits</h3>
            <ul className="space-y-2">
              {config.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-kp-on-surface-variant">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnPrimary, "h-8 border-transparent px-4 text-xs")}
                asChild
              >
                <Link href="/settings/modules">{ctaLabel}</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                asChild
              >
                <Link href="/showing-hq">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to ShowingHQ
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
