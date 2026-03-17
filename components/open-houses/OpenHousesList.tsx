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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrandButton } from "@/components/ui/BrandButton";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Calendar, QrCode, Plus, Users, LayoutGrid } from "lucide-react";

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  property: { address1: string; city: string; state: string };
  _count: { visitors: number };
};

export function OpenHousesList() {
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/open-houses")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOpenHouses(json.data || []);
      })
      .catch(() => setError("Failed to load open houses"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <PageLoading />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

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
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "ACTIVE" || s === "SCHEDULED") return "default";
    if (s === "COMPLETED") return "secondary";
    if (s === "CANCELLED") return "destructive";
    return "outline";
  };

  const activeOrUpcoming = openHouses.filter(
    (oh) => oh.status === "ACTIVE" || oh.status === "SCHEDULED"
  );
  const activeCount = activeOrUpcoming.length;
  const totalVisitors = openHouses.reduce((sum, oh) => sum + oh._count.visitors, 0);
  const now = new Date();
  const nextUp = activeOrUpcoming
    .filter((oh) => new Date(oh.startAt) >= now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero — match dashboard hero system */}
      <header
        className="relative rounded-2xl bg-[#0B1A3C] px-8 py-8 shadow-2xl"
        role="banner"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7DD3F5]">
              Open House Ops
            </p>
            <h1
              className="text-3xl font-extrabold tracking-tight text-white md:text-4xl"
              style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
            >
              Open Houses
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300 md:text-base">
              Create and manage your public open house events.
            </p>
          </div>
          <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">
            <BrandButton variant="primary" size="sm" asChild>
              <Link href="/open-houses/new">New Open House</Link>
            </BrandButton>
            <Button variant="outline" size="sm" className="border-slate-300 bg-white/5 text-white hover:bg-white/10" asChild>
              <Link href="/open-houses/sign-in">
                <QrCode className="mr-2 h-4 w-4" />
                Open sign-in page
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Summary strip — control center at a glance */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total events</p>
              <p className="text-xl font-semibold">{openHouses.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active / upcoming</p>
              <p className="text-xl font-semibold">{activeCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total visitors</p>
              <p className="text-xl font-semibold">{totalVisitors}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <BrandButton variant="primary" size="sm" asChild>
              <Link href="/open-houses/sign-in">
                <QrCode className="mr-2 h-4 w-4" />
                Open sign-in page
              </Link>
            </BrandButton>
          </div>
        </div>
      </div>

      {/* Main content: table + side panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>All events</CardTitle>
            <CardDescription>
              Upcoming and past open houses. Open an event to manage visitors, follow-ups, and the QR sign-in link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openHouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <p className="text-muted-foreground mb-4">No open houses yet. Create one to get started.</p>
                <BrandButton asChild>
                  <Link href="/open-houses/new">New Open House</Link>
                </BrandButton>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Visitors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openHouses.map((oh) => (
                    <TableRow key={oh.id}>
                      <TableCell className="font-medium">{oh.title}</TableCell>
                      <TableCell>
                        {oh.property.address1}, {oh.property.city},{" "}
                        {oh.property.state}
                      </TableCell>
                      <TableCell>
                        {formatDate(oh.startAt)} {formatTime(oh.startAt)}–{formatTime(oh.endAt)}
                      </TableCell>
                      <TableCell>{oh._count.visitors}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(oh.status)}>{oh.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/open-houses/${oh.id}`}>View</Link>
                          </Button>
                          {(oh.status === "ACTIVE" || oh.status === "SCHEDULED") && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/open-houses/${oh.id}/sign-in`}>Sign-in</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Side panel — quick actions and what's next */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick actions</CardTitle>
              <CardDescription>Common next steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/open-houses/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New open house
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/open-houses/sign-in">
                  <QrCode className="mr-2 h-4 w-4" />
                  Launch sign-in & QR
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm" asChild>
                <Link href="/properties">View properties</Link>
              </Button>
            </CardContent>
          </Card>

          {nextUp && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next upcoming</CardTitle>
                <CardDescription>Soonest active or scheduled event</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{nextUp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {nextUp.property.address1}, {nextUp.property.city}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(nextUp.startAt)} · {formatTime(nextUp.startAt)}–{formatTime(nextUp.endAt)}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/open-houses/${nextUp.id}/sign-in`}>Open sign-in</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/open-houses/${nextUp.id}`}>View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeCount === 0 && openHouses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">No upcoming events</CardTitle>
                <CardDescription>Schedule a new open house to get a sign-in link and QR.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <Link href="/open-houses/new">New open house</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
