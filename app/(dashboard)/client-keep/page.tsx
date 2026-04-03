"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

export default function ClientKeepOverviewPage() {
  const [stats, setStats] = useState<{ contactsCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setStats(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
    <div className="space-y-5">
      <h2 className="sr-only">Snapshot and shortcuts</h2>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" className={cn(kpBtnPrimary, "border-transparent")} asChild>
          <Link href="/contacts">View all contacts</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> All Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.contactsCount ?? 0}</p>
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto justify-start p-0 text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
              <Link href="/contacts">View all →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="border-kp-outline-variant/70 bg-kp-surface-high/5">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="text-sm font-medium text-kp-on-surface-muted">
            Quick orientation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-xs leading-relaxed text-kp-on-surface-variant sm:text-sm">
            Segments open saved filters; Tags shows labels and counts. Shortcuts jump to
            communications, follow-ups, and activity.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "text-xs")} asChild>
              <Link href="/client-keep/segments">Segments</Link>
            </Button>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "text-xs")} asChild>
              <Link href="/client-keep/tags">Tags</Link>
            </Button>
            <Button variant="outline" size="sm" className={cn(kpBtnPrimary, "border-transparent text-xs")} asChild>
              <Link href="/client-keep/communications">Communications hub</Link>
            </Button>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "text-xs")} asChild>
              <Link href="/client-keep/follow-ups">Follow-ups</Link>
            </Button>
            <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "text-xs")} asChild>
              <Link href="/client-keep/activity">Recent activity</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </ModuleGate>
  );
}
