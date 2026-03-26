"use client";

import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { ArrowRight, Bell, Calendar, ClipboardList, FileText, MessageSquare, Users } from "lucide-react";

const hubSections: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof MessageSquare;
}[] = [
  {
    title: "Contact communication log",
    description:
      "Log calls and emails on a contact’s timeline, see notes, and add follow-up reminders. Start from your contacts list or open any contact.",
    href: "/contacts",
    cta: "Open contacts",
    icon: Users,
  },
  {
    title: "Open house follow-up drafts",
    description:
      "Review AI-assisted email drafts for visitors who signed in. Also available from ClientKeep → Follow-ups or ShowingHQ.",
    href: "/showing-hq/follow-ups",
    cta: "Open follow-up drafts",
    icon: Bell,
  },
  {
    title: "Personal activity & tasks",
    description:
      "Your own tasks—including email and follow-up types—with optional property and contact links. Separate from the per-contact timeline.",
    href: "/showing-hq/activity",
    cta: "Open activity",
    icon: ClipboardList,
  },
  {
    title: "Activity templates",
    description:
      "Reusable patterns for tasks and follow-ups. Apply when creating activities in ShowingHQ Activity.",
    href: "/showing-hq/templates",
    cta: "Open templates",
    icon: FileText,
  },
  {
    title: "Buyer-agent feedback (private showings)",
    description:
      "After a showing, draft and copy feedback requests to the buyer’s agent from the showings list or event editor—ShowingHQ, not open houses.",
    href: "/showing-hq/showings",
    cta: "Open showings",
    icon: Calendar,
  },
];

export default function ClientKeepCommunicationsHubPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Where communication-related work lives today—deep links only, no merged inbox." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">Communications</h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            KeyPilot does not sync your email inbox. Use the links below to jump to the right workflow; everything stays user-triggered in the existing surfaces.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {hubSections.map(({ title, description, href, cta, icon: Icon }) => (
            <Card key={href} className="border-kp-outline bg-kp-surface">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-kp-on-surface">
                  <Icon className="h-4 w-4 text-kp-gold" />
                  {title}
                </CardTitle>
                <CardDescription className="text-kp-on-surface-variant">{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 gap-1.5 text-xs")} asChild>
                  <Link href={href}>
                    {cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-kp-outline bg-kp-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-kp-on-surface">
              <MessageSquare className="h-4 w-4 text-kp-gold" />
              ClientKeep shortcuts
            </CardTitle>
            <CardDescription className="text-kp-on-surface-variant">
              Follow-up queue scoped to your ClientKeep navigation (same data as ShowingHQ).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "h-8 text-xs")} asChild>
              <Link href="/client-keep/follow-ups">Follow-ups (ClientKeep)</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModuleGate>
  );
}
