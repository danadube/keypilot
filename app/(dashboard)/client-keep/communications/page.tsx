"use client";

import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
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
    description: "Log calls and emails on each contact’s timeline.",
    href: "/contacts/all",
    cta: "Open contacts",
    icon: Users,
  },
  {
    title: "Open house follow-up drafts",
    description: "Review and send visitor follow-up emails.",
    href: "/showing-hq/follow-ups",
    cta: "Open follow-up drafts",
    icon: Bell,
  },
  {
    title: "Personal activity & tasks",
    description: "Your tasks with optional contact and property links.",
    href: "/showing-hq/activity",
    cta: "Open activity",
    icon: ClipboardList,
  },
  {
    title: "Activity templates",
    description: "Reusable patterns for tasks in ShowingHQ Activity.",
    href: "/showing-hq/templates",
    cta: "Open templates",
    icon: FileText,
  },
  {
    title: "Buyer-agent feedback (private showings)",
    description: "Draft feedback requests after private showings.",
    href: "/showing-hq/showings",
    cta: "Open showings",
    icon: Calendar,
  },
];

export default function ClientKeepCommunicationsHubPage() {
  return (
    <ModuleGate moduleId="client-keep" moduleName="ClientKeep" backHref="/showing-hq">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-kp-on-surface">
          Communication workflows
        </p>

        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {hubSections.map(({ title, description, href, cta, icon: Icon }) => (
            <Card key={href} className="border-kp-outline bg-kp-surface">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-kp-on-surface">
                  <Icon className="h-4 w-4 text-kp-gold" />
                  {title}
                </CardTitle>
                <CardDescription className="text-kp-on-surface-variant">
                  {description}
                </CardDescription>
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
      </div>
    </ModuleGate>
  );
}
