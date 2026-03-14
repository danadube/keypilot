"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { getUpgradeConfig } from "@/lib/upgrade-modules";
import { isUpgradeModule } from "@/lib/module-access";
import type { ModuleId } from "@/lib/modules";

export default function UpgradeModulePage() {
  const params = useParams();
  const moduleId = params.moduleId as ModuleId;
  const config = getUpgradeConfig(moduleId);

  if (!config || !isUpgradeModule(moduleId)) {
    return (
      <div className="flex flex-col gap-[var(--space-xl)]">
        <BrandPageHeader
          title="Module not found"
          description="This upgrade module doesn't exist or isn't available."
        />
        <BrandButton variant="secondary" asChild>
          <Link href="/showing-hq">← Back to ShowingHQ</Link>
        </BrandButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title={config.name}
        description={config.description}
        actions={
          <BrandButton variant="primary" asChild>
            <Link href="/settings/modules">Upgrade to unlock</Link>
          </BrandButton>
        }
      />

      <BrandCard elevated padded className="max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
            <Lock
              className="h-7 w-7 text-[var(--brand-primary)]"
              aria-hidden
            />
          </div>
          <div>
            <h2
              className="mb-2 font-semibold text-[var(--brand-primary)]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-h3-size)",
              }}
            >
              {config.headline}
            </h2>
            <p
              className="mb-6 text-[var(--brand-text-muted)]"
              style={{
                fontSize: "var(--text-body-size)",
                lineHeight: "var(--text-body-line)",
              }}
            >
              {config.description}
            </p>
            <h3 className="mb-3 font-semibold text-[var(--brand-text)]">
              Benefits
            </h3>
            <ul className="space-y-2">
              {config.benefits.map((benefit, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[var(--brand-text-muted)]"
                  style={{
                    fontSize: "var(--text-body-size)",
                    lineHeight: "var(--text-body-line)",
                  }}
                >
                  <Check
                    className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]"
                    aria-hidden
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <BrandButton variant="primary" asChild>
                <Link href="/settings/modules">Upgrade to unlock</Link>
              </BrandButton>
              <BrandButton variant="secondary" asChild>
                <Link href="/showing-hq">← Back to ShowingHQ</Link>
              </BrandButton>
            </div>
          </div>
        </div>
      </BrandCard>
    </div>
  );
}
