"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { QrCode, ExternalLink, Copy, Link2 } from "lucide-react";

export interface SignInQuickCardProps {
  signInUrl: string;
  openHouseId: string;
  openHouseTitle?: string;
}

export function SignInQuickCard({
  signInUrl,
  openHouseId,
  openHouseTitle,
}: SignInQuickCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signInUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <BrandCard elevated padded className="shrink-0">
      <p className="mb-2 text-sm font-medium text-[var(--brand-text-muted)]">
        Sign-in page
      </p>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[var(--brand-text-muted)]" />
          <span className="truncate text-sm text-[var(--brand-text)]">
            {openHouseTitle ?? "Visitor check-in"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)} asChild>
            <a href={signInUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview
            </a>
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)} onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied!" : "Copy link"}
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary)} asChild>
            <Link href={`/open-houses/${openHouseId}/sign-in`}>
              <QrCode className="mr-2 h-4 w-4" />
              Host console
            </Link>
          </Button>
        </div>
      </div>
    </BrandCard>
  );
}
