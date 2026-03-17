"use client";

import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";

export default function ShowingHQActivityPage() {
  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      <ShowingHQPageHero
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
