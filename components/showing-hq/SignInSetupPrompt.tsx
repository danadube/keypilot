"use client";

import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { QrCode } from "lucide-react";

/** Shown when user has no open house — prompts to create one to get sign-in link and QR. */
export function SignInSetupPrompt() {
  return (
    <BrandCard elevated padded className="shrink-0 min-w-[200px]">
      <p className="mb-2 text-sm font-medium text-[var(--brand-text-muted)]">
        Sign-in page
      </p>
      <p className="mb-3 text-sm text-[var(--brand-text)]">
        Create an open house to get a unique sign-in link and QR code. Visitors check in on their phone—no clipboard needed.
      </p>
      <BrandButton variant="primary" size="sm" asChild>
        <Link href="/open-houses/new">
          <QrCode className="mr-2 h-4 w-4" />
          Create open house
        </Link>
      </BrandButton>
    </BrandCard>
  );
}
