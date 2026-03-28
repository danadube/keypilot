"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { ModuleGate } from "@/components/shared/ModuleGate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      valueProposition="Contacts, tags, segments, communications, and follow-ups — relationship work stays here; closings and commissions live in Transactions."
      backHref="/showing-hq"
    >
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ClientKeep</h1>
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
      <Card>
        <CardHeader>
          <CardTitle>Customer relationship management</CardTitle>
          <CardDescription>
            Relationships and touchpoints — contacts, communication history, and open-house follow-ups.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ClientKeep is for people and touchpoints: segments are saved filtered contact views, tags
            show labels and usage, and the shortcuts below open communications, follow-ups, and
            activity. Track active closings and payouts in Transactions from the platform sidebar.
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
