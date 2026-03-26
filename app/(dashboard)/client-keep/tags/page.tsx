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
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { Tag, Users } from "lucide-react";

export default function ClientKeepTagsPage() {
  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Tags are edited per contact—there is no separate tag manager yet." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">Tags</h1>
          <p className="max-w-xl text-sm text-kp-on-surface-variant">
            Open a contact to add or remove tags. Use the contacts list to find people quickly, then use the tag section on their profile.
          </p>
        </div>

        <Card className="border-kp-outline bg-kp-surface">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-kp-on-surface">
              <Tag className="h-4 w-4 text-kp-gold" />
              Where to manage tags
            </CardTitle>
            <CardDescription className="text-kp-on-surface-variant">
              All tag changes happen on the contact detail screen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 gap-2 text-xs")} asChild>
              <Link href="/contacts">
                <Users className="h-3.5 w-3.5" />
                Open contacts
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ModuleGate>
  );
}
