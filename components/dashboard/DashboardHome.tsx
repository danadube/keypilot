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
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type Stats = {
  propertiesCount: number;
  openHousesCount: number;
  contactsCount: number;
  recentOpenHouses: {
    id: string;
    title: string;
    startAt: string;
    status: string;
    property: { address1: string; city: string; state: string };
    _count: { visitors: number };
  }[];
};

export function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/dashboard/stats")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setStats(json.data);
      })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => loadData(), []);

  if (loading) return <PageLoading message="Loading dashboard..." />;
  if (error) {
    const isUserNotFound = error.toLowerCase().includes("user not found");
    return (
      <ErrorMessage
        message={
          isUserNotFound
            ? "Your account is still syncing. If you just signed up, wait a moment and try again. (In production, ensure the Clerk webhook is configured.)"
            : error
        }
        onRetry={loadData}
      />
    );
  }
  if (!stats) return null;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const statusVariant = (
    s: string
  ): "default" | "secondary" | "outline" | "destructive" => {
    if (s === "ACTIVE" || s === "SCHEDULED") return "default";
    if (s === "COMPLETED") return "secondary";
    if (s === "CANCELLED") return "destructive";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/properties/new">Add property</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/open-houses/new">New open house</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.propertiesCount}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/properties">View all</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open houses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.openHousesCount}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/open-houses">View all</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{stats.contactsCount}</p>
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/contacts">View all</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent open houses</CardTitle>
          <CardDescription>
            Your latest open house events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentOpenHouses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No open houses yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentOpenHouses.map((oh) => (
                <div
                  key={oh.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{oh.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {oh.property.address1}, {oh.property.city},{" "}
                      {oh.property.state}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(oh.startAt)} · {formatTime(oh.startAt)} ·{" "}
                      {oh._count.visitors} visitors
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(oh.status)}>{oh.status}</Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/open-houses">All open houses</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
