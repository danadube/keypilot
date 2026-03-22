import { CurrentPlanCard } from "@/components/shared/CurrentPlanCard";
import { SHOWINGHQ_PLAN } from "@/lib/current-plan";

export default function ModulesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-kp-on-surface">Modules &amp; plans</h2>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Your current plan and available upgrades.
        </p>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-kp-on-surface-variant">Current plan</h3>
        <CurrentPlanCard plan={SHOWINGHQ_PLAN} />
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="text-sm text-kp-on-surface-variant">
          Browse locked modules from the sidebar under &quot;Upgrade Your Platform&quot; to add ClientKeep, FarmTrackr, SellerPulse, or MarketPilot. Billing integration coming soon.
        </p>
      </div>
    </div>
  );
}
