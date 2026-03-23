"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function SupraInboxPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Parsed Supra showing notifications will appear here for review once the integration is available." />
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kp-surface-high">
            <Inbox className="h-6 w-6 text-kp-on-surface-variant" />
          </div>
          <p className="text-sm font-medium text-kp-on-surface">Supra integration coming soon</p>
          <p className="mt-2 max-w-md text-xs leading-snug text-kp-on-surface-variant">
            Connect Supra to import showing notifications, then review and request feedback from here.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-kp-outline bg-transparent text-kp-on-surface hover:bg-kp-surface-high"
            asChild
          >
            <Link href="/showing-hq/showings/new">Add showing manually</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
