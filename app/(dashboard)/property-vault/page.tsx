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
import { Building2 } from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

export default function PropertyVaultOverviewPage() {
  const [stats, setStats] = useState<{ propertiesCount: number } | null>(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">PropertyVault</h1>
        <Button asChild>
          <Link href="/properties/new">Add property</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" /> All Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.propertiesCount ?? 0}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/properties">View all →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Property database</CardTitle>
          <CardDescription>
            Central database of all property records. Track listings, documents, and activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the sidebar to navigate to All Properties, Active Listings, or other property views.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
