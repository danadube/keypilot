"use client";

import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";

export default function ShowingHQTemplatesPage() {
  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
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
