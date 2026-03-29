"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/track-usage-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
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
import { QrCode, Tablet, Printer, ArrowRight, List, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";

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

  const rightPanel = (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4" />
            Sign-in workflow
          </CardTitle>
          <CardDescription>How host sign-in and QR work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">1</span>
            <div>
              <p className="font-medium">Choose an open house</p>
              <p className="text-muted-foreground">Select the event you’re running today (left).</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">2</span>
            <div>
              <p className="font-medium">Open host sign-in</p>
              <p className="text-muted-foreground">Use on a tablet at the door to check visitors in.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">3</span>
            <div>
              <p className="font-medium">QR or print poster</p>
              <p className="text-muted-foreground">Visitors scan QR or use the link; you can print a poster from the host page.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "w-full justify-start")}
            asChild
          >
            <Link href="/open-houses">
              <List className="mr-2 h-4 w-4" />
              All open houses
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnSecondary, "w-full justify-start")}
            asChild
          >
            <Link href="/open-houses/new">
              <Plus className="mr-2 h-4 w-4" />
              New open house
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">At a glance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active / upcoming</span>
            <span className="font-medium">{active.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total events</span>
            <span className="font-medium">{openHouses.length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DashboardContextStrip
          className="min-w-0 flex-1 sm:max-w-2xl"
          label="Host tools"
          message="Choose an event below to open host sign-in on a tablet or print a QR poster for visitors."
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <BrandButton variant="primary" size="sm" asChild>
            <Link href="#host-sign-in">Open host sign-in</Link>
          </BrandButton>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "shrink-0")} asChild>
            <Link href="/open-houses">View open houses</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Primary: launch host sign-in */}
        <div className="min-w-0 flex-1 space-y-6">
          {active.length === 0 && recentOthers.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No open houses yet</CardTitle>
                <CardDescription>
                  Create an open house first. Then return here to open the host sign-in page on a tablet or print the QR poster for visitors.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button variant="outline" className={cn(kpBtnPrimary, "border-transparent")} asChild>
                  <Link href="/open-houses/new">New open house</Link>
                </Button>
                <Button variant="outline" className={kpBtnSecondary} asChild>
                  <Link href="/open-houses">View open houses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {active.length > 0 && (
                <Card id="host-sign-in">
                  <CardHeader>
                    <CardTitle className="text-lg">Launch host sign-in</CardTitle>
                    <CardDescription>
                      Select an open house to open the host page (tablet check-in and QR). Each event has its own link.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {active.map((oh) => (
                      <div
                        key={oh.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{oh.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {oh.property.address1}, {oh.property.city} · {formatDate(oh.startAt)} {formatTime(oh.startAt)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {oh._count.visitors} visitor{oh._count.visitors !== 1 ? "s" : ""} signed in
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnPrimary, "border-transparent")}
                            asChild
                          >
                            <Link href={`/open-houses/${oh.id}/sign-in`}>
                              <Tablet className="mr-2 h-4 w-4" />
                              Host sign-in
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
                            <Link href={`/open-houses/${oh.id}/sign-in/print`}>
                              <Printer className="mr-2 h-4 w-4" />
                              Print QR
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
                            <Link href={showingHqOpenHouseWorkspaceHref(oh.id)}>
                              View <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {recentOthers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Past events</CardTitle>
                    <CardDescription>Reopen sign-in for a completed or cancelled event if needed.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentOthers.map((oh) => (
                      <div
                        key={oh.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium text-sm">{oh.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {oh.property.address1}, {oh.property.city} · {formatDate(oh.startAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{oh.status}</Badge>
                          <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
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

        {/* Right: workflow + shortcuts + status */}
        <div className="shrink-0 lg:w-[320px] lg:sticky lg:top-6">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
