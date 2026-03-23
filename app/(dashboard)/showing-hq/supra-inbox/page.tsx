"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export default function SupraInboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Supra Inbox</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Showing notifications parsed from Supra email scraps.
        </p>
      </div>
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kp-surface-high">
            <Inbox className="h-8 w-8 text-kp-on-surface-variant" />
          </div>
          <h2 className="text-lg font-semibold text-kp-on-surface">
            Supra integration coming soon
          </h2>
          <p className="mt-2 max-w-md text-sm text-kp-on-surface-variant">
            Connect your Supra account to automatically import showing notifications.
            Parsed showings will appear here for review and feedback requests.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-6 border-kp-outline bg-transparent text-kp-on-surface hover:bg-kp-surface-high"
            asChild
          >
            <Link href="/showing-hq/showings/new">Add showing manually</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
