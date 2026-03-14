"use client";

import { ModuleGate } from "@/components/shared/ModuleGate";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";

export default function SellerPulsePage() {
  return (
    <ModuleGate
      moduleId="seller-pulse"
      moduleName="SellerPulse"
      valueProposition="Seller reports and listing performance insights for your sellers."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-[var(--space-xl)]">
        <BrandPageHeader
          title="SellerPulse"
          description="Seller reports and listing performance."
        />
        <BrandCard padded elevated>
          <p className="text-[var(--brand-text-muted)]">
            Coming soon: seller reports and performance dashboards.
          </p>
        </BrandCard>
      </div>
    </ModuleGate>
  );
}
