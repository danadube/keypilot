import type { Metadata } from "next";
import { DailyBriefingPreviewView } from "@/components/daily-briefing/daily-briefing-preview-view";

export const metadata: Metadata = {
  title: "Daily briefing preview | KeyPilot",
  description:
    "Preview the daily briefing email (HTML and plain text) using the same renderer as delivery — no email sent.",
};

export default function SettingsDailyBriefingPreviewPage() {
  return <DailyBriefingPreviewView />;
}
