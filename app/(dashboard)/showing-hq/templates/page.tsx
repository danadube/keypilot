"use client";

import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQTemplatesPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="Save and reuse follow-up and message templates for open house outreach." />
      <div className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-8 text-center">
        <p className="text-sm text-kp-on-surface-variant">
          Coming soon: create and manage templates for open house follow-ups.
        </p>
      </div>
    </div>
  );
}
