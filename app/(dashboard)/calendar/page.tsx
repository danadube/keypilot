import type { Metadata } from "next";
import { CalendarPageView } from "@/components/calendar/calendar-page-view";

export const metadata: Metadata = {
  title: "Calendar | KeyPilot",
  description:
    "Weekly planning across showings, Task Pilot, ClientKeep follow-ups, and TransactionHQ milestones.",
};

export default function CalendarPage() {
  return <CalendarPageView />;
}
