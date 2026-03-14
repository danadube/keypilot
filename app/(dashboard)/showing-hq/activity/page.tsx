"use client";

import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";

export default function ShowingHQActivityPage() {
  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="Activity"
        description="Track showing activity, sign-ins, and follow-ups."
      />
      <BrandCard padded elevated>
        <BrandSectionHeader
          title="Activity feed"
          description="Activity for your showings will appear here."
        />
        <p className="mt-4 text-[var(--brand-text-muted)]">
          Coming soon: a unified activity feed across open houses and follow-ups.
        </p>
      </BrandCard>
    </div>
  );
}
