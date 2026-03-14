import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";

export default function ModulesSettingsPage() {
  return (
    <div className="space-y-8">
      <BrandSectionHeader
        title="Module Settings"
        description="Configure module-specific options. Use the links below for settings unique to each module."
      />
      <BrandCard padded>
        <p className="text-[var(--brand-text-muted)]">
          Module-specific settings coming soon. Each module (PropertyVault, ShowingHQ, ClientKeep, etc.) may have its own configuration available under /settings/modules/[moduleId].
        </p>
      </BrandCard>
    </div>
  );
}
