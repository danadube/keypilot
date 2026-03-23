"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Calendar, List, Plus } from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";

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
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const propertiesCount = stats?.propertiesCount ?? 0;
  const openHousesCount = stats?.openHousesCount ?? 0;
  const vaultContextMessage =
    propertiesCount === 0 && openHousesCount === 0
      ? "Add a property to start open houses and capturing visitors."
      : `You have ${propertiesCount} propert${propertiesCount === 1 ? "y" : "ies"} on file and ${openHousesCount} open house ${openHousesCount === 1 ? "event" : "events"} linked.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DashboardContextStrip
          label="Snapshot"
          message={vaultContextMessage}
          className="min-w-0 flex-1 sm:max-w-2xl"
        />
        <Button asChild className="w-full shrink-0 sm:w-auto">
          <Link href="/properties/new">Add property</Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" /> All Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.propertiesCount ?? 0}</p>
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
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
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/properties">All properties</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/properties/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add property
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/open-houses/new">New open house</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Context card */}
      <Card>
        <CardHeader>
          <CardTitle>Property database</CardTitle>
          <CardDescription>
            Central database of property records. Add properties to create open houses, track listings, and capture visitors.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Manage properties from the list, then schedule open house events and view activity per property.
          </p>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/properties">Go to properties</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
