"use client";

import Link from "next/link";
import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { Inbox } from "lucide-react";

export default function SupraInboxPage() {
  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      <ShowingHQPageHero
        title="Supra Inbox"
        description="Showing notifications parsed from Supra email scraps."
      />
      <BrandCard elevated padded>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Inbox className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--brand-text)]">
            Supra integration coming soon
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--brand-text-muted)]">
            Connect your Supra account to automatically import showing notifications.
            Parsed showings will appear here for review and feedback requests.
          </p>
          <BrandButton variant="secondary" size="sm" className="mt-6" asChild>
            <Link href="/showing-hq/showings/new">Add showing manually</Link>
          </BrandButton>
        </div>
      </BrandCard>
    </div>
  );
}
