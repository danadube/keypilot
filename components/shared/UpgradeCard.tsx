"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";

export interface UpgradeCardProps {
  moduleName: string;
  headline: string;
  description: string;
  moduleId: string;
  backHref?: string;
}

/**
 * Reusable upgrade card for locked/premium modules.
 * Displays module name, headline, description, and CTA.
 */
export function UpgradeCard({
  moduleName,
  headline,
  description,
  moduleId,
  backHref = "/",
}: UpgradeCardProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <BrandCard
        elevated
        padded
        className="max-w-md border-[var(--brand-border)]"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
            <Lock
              className="h-7 w-7 text-[var(--brand-primary)]"
              aria-hidden
            />
          </div>
          <h2
            className="mb-2 font-semibold text-[var(--brand-text)]"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-h3-size)",
            }}
          >
            {moduleName}
          </h2>
          <p
            className="mb-2 font-medium text-[var(--brand-primary)]"
            style={{
              fontSize: "var(--text-body-size)",
              lineHeight: "var(--text-body-line)",
            }}
          >
            {headline}
          </p>
          <p
            className="mb-6 max-w-sm text-[var(--brand-text-muted)]"
            style={{
              fontSize: "var(--text-body-size)",
              lineHeight: "var(--text-body-line)",
            }}
          >
            {description}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <BrandButton variant="primary" asChild>
              <Link href={`/upgrade/${moduleId}`}>Upgrade to unlock</Link>
            </BrandButton>
            <BrandButton variant="secondary" asChild>
              <Link href={backHref}>← Back to platform</Link>
            </BrandButton>
          </div>
        </div>
      </BrandCard>
    </div>
  );
}
