"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, List, Plus } from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { UI_COPY } from "@/lib/ui-copy";

type DashboardStats = {
  propertiesCount: number;
  openHousesCount?: number;
  contactsCount?: number;
};

export default function PropertyVaultOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setStats(json.data);
      })
      .catch(() => setError(UI_COPY.errors.load("stats")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const propertiesCount = stats?.propertiesCount ?? 0;
  const openHousesCount = stats?.openHousesCount ?? 0;
  const vaultContextMessage =
    propertiesCount === 0 && openHousesCount === 0
      ? "Add a listing to run open houses and capture visitors."
      : `${propertiesCount} propert${propertiesCount === 1 ? "y" : "ies"} · ${openHousesCount} open house ${openHousesCount === 1 ? "event" : "events"}`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-kp-on-surface-variant">{vaultContextMessage}</p>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" /> Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.propertiesCount ?? 0}</p>
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto min-h-0 p-0 text-sm font-normal text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
              <Link href="/properties">View all →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" /> Open Houses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.openHousesCount ?? 0}</p>
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto min-h-0 p-0 text-sm font-normal text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
              <Link href="/open-houses">View all →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <List className="h-4 w-4" /> Quick links
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
              <Link href="/properties">Properties</Link>
            </Button>
            <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
              <Link href="/properties/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add property
              </Link>
            </Button>
            <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
              <Link href="/open-houses/new">New open house</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
