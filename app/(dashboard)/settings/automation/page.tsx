import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";

export default function AutomationSettingsPage() {
  return (
    <div className="space-y-8">
      <BrandSectionHeader
        title="Automation"
        description="Configure automation rules, triggers, and workflows."
      />
      <BrandCard padded>
        <p className="text-[var(--brand-text-muted)]">
          Automation settings coming soon. You will be able to set up triggers, rules, and workflows for email, calendar, and follow-ups.
        </p>
      </BrandCard>
    </div>
  );
}
