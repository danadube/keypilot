"use client";

import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

export default function ShowingHQActivityPage() {
  return (
    <div className="flex flex-col gap-4">
      <DashboardContextStrip message="A unified timeline of sign-ins, showings, and follow-up activity will live here." />
      <div className="rounded-xl border border-kp-outline bg-kp-surface px-4 py-8 text-center">
        <p className="text-sm text-kp-on-surface-variant">
          Coming soon: activity across open houses and follow-ups in one feed.
        </p>
      </div>
    </div>
  );
}
