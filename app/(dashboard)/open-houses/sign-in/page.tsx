"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/track-usage-client";
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
import { QrCode } from "lucide-react";

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  property: { address1: string; city: string; state: string };
  _count: { visitors: number };
};

export default function OpenSignInPage() {
  const router = useRouter();
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("sign_in_page_opened", { context: "setup" });
  }, []);

  useEffect(() => {
    fetch("/api/v1/open-houses")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOpenHouses(json.data || []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading && openHouses.length > 0) {
      const active = openHouses.filter(
        (oh) => oh.status === "ACTIVE" || oh.status === "SCHEDULED"
      );
      if (active.length === 1) {
        router.replace(`/open-houses/${active[0].id}/sign-in`);
      }
    }
  }, [loading, openHouses, router]);

  if (loading) return <PageLoading message="Loading open houses..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const active = openHouses.filter(
    (oh) => oh.status === "ACTIVE" || oh.status === "SCHEDULED"
  );
  const others = openHouses.filter(
    (oh) => oh.status !== "ACTIVE" && oh.status !== "SCHEDULED"
  );
  const recentOthers = others.slice(0, 5);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  if (active.length === 1) {
    return <PageLoading message="Opening sign-in..." />;
  }

  const statusPanel = (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active / upcoming</span>
            <span className="font-medium">{active.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total open houses</span>
            <span className="font-medium">{openHouses.length}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How to use</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Open the host sign-in page on a tablet at your open house, or print the QR poster for visitors to scan.</p>
          <p>Each open house has its own QR link and check-in list.</p>
          <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
            <Link href="/open-houses">View all open houses</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6 lg:max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/open-houses">← Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold">Sign-in & QR</h1>
        </div>

        {active.length === 0 && recentOthers.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No open houses yet</CardTitle>
              <CardDescription>
                Create an open house first, then open the host sign-in page for your tablet or print the QR poster.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/open-houses/new">New open house</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {active.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active / upcoming</CardTitle>
                  <CardDescription>Select an open house to open the host sign-in page (QR + check-in)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {active.map((oh) => (
                    <div
                      key={oh.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{oh.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {oh.property.address1}, {oh.property.city} ·{" "}
                          {formatDate(oh.startAt)} {formatTime(oh.startAt)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {oh._count.visitors} visitor{oh._count.visitors !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/open-houses/${oh.id}/sign-in`}>
                          <QrCode className="mr-2 h-4 w-4" />
                          Host sign-in
                        </Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {recentOthers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent</CardTitle>
                  <CardDescription>Past open houses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentOthers.map((oh) => (
                    <div
                      key={oh.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{oh.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {oh.property.address1}, {oh.property.city} ·{" "}
                          {formatDate(oh.startAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{oh.status}</Badge>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/open-houses/${oh.id}/sign-in`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Supporting context panel */}
      <div className="shrink-0 lg:w-64 lg:sticky lg:top-6">{statusPanel}</div>
    </div>
  );
}
