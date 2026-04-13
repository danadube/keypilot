import type { Metadata } from "next";
import { DailyBriefingDeliverySettings } from "@/components/daily-briefing/daily-briefing-delivery-settings";
import { DailyBriefingSendHistory } from "@/components/daily-briefing/daily-briefing-send-history";

export const metadata: Metadata = {
  title: "Daily briefing | KeyPilot",
  description: "Email delivery schedule for your daily briefing.",
};

export default function SettingsDailyBriefingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Daily briefing</h1>
        <p className="mt-0.5 text-sm text-kp-on-surface-variant">Email schedule and preview</p>
      </div>
      <DailyBriefingDeliverySettings />
      <DailyBriefingSendHistory />
    </div>
  );
}
