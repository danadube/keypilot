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
import { Badge } from "@/components/ui/badge";
import { Calendar, QrCode } from "lucide-react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type Stats = {
  openHousesCount: number;
  recentOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
};

export default function ShowingHQOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">ShowingHQ</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/open-houses/sign-in">
              <QrCode className="mr-2 h-4 w-4" />
              Open sign-in
            </Link>
          </Button>
          <Button asChild>
            <Link href="/open-houses/new">New showing</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" /> Scheduled Showings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats?.openHousesCount ?? 0}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/open-houses">View all →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent showings</CardTitle>
          <CardDescription>Your latest open house events</CardDescription>
        </CardHeader>
        <CardContent>
          {!stats?.recentOpenHouses?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No showings yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentOpenHouses.map((oh) => (
                <div
                  key={oh.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{oh.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {oh.property.address1}, {oh.property.city} · {formatDate(oh.startAt)} · {oh._count.visitors} visitors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={oh.status === "ACTIVE" || oh.status === "SCHEDULED" ? "default" : "secondary"}>
                      {oh.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/open-houses">All showings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
