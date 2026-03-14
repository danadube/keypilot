import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { CurrentPlanCard } from "@/components/shared/CurrentPlanCard";
import { SHOWINGHQ_PLAN } from "@/lib/current-plan";

export default function ModulesSettingsPage() {
  return (
    <div className="space-y-8">
      <BrandSectionHeader
        title="Modules & plans"
        description="Your current plan and available upgrades."
      />

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text-muted)]">Current plan</h3>
        <CurrentPlanCard plan={SHOWINGHQ_PLAN} />
      </div>

      <BrandCard padded>
        <p className="text-[var(--brand-text-muted)]">
          Browse locked modules from the sidebar under &quot;Upgrade Your Platform&quot; to add ClientKeep, FarmTrackr, SellerPulse, or MarketPilot. Billing integration coming soon.
        </p>
      </BrandCard>
    </div>
  );
}
