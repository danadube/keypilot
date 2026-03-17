"use client";

import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";

export default function ShowingHQTemplatesPage() {
  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      <ShowingHQPageHero
        title="Templates"
        description="Manage follow-up and communication templates."
      />
      <BrandCard padded elevated>
        <BrandSectionHeader
          title="Templates"
          description="Templates for follow-up emails and messages."
        />
        <p className="mt-4 text-[var(--brand-text-muted)]">
          Coming soon: create and manage templates for open house follow-ups.
        </p>
      </BrandCard>
    </div>
  );
}
