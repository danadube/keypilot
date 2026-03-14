import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";

export default function AISettingsPage() {
  return (
    <div className="space-y-8">
      <BrandSectionHeader
        title="AI Settings"
        description="Configure AI features, daily briefing, and intelligence preferences."
      />
      <BrandCard padded>
        <p className="text-[var(--brand-text-muted)]">
          AI settings coming soon. You will be able to enable or disable AI features per connected account, customize the daily briefing, and manage priority inbox intelligence.
        </p>
      </BrandCard>
    </div>
  );
}
