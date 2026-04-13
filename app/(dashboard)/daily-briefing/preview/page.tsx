import { permanentRedirect } from "next/navigation";

/** @deprecated Use `/settings/daily-briefing/preview` (settings shell + nav). */
export default function LegacyDailyBriefingPreviewRedirect() {
  permanentRedirect("/settings/daily-briefing/preview");
}
