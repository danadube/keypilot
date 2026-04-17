import Link from "next/link";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
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
import { UI_COPY } from "@/lib/ui-copy";

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

export function DashboardContent({ stats }: { stats: Stats }) {
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
          <Button asChild variant="outline" className={cn(kpBtnPrimary, "border-transparent")}>
            <Link href="/properties/new">Add property</Link>
          </Button>
          <Button variant="outline" asChild className={kpBtnSecondary}>
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
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto min-h-0 p-0 font-normal text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
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
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto min-h-0 p-0 font-normal text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
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
            <Button
              variant="ghost"
              className={cn(
                kpBtnTertiary,
                "h-auto min-h-0 p-0 font-normal text-kp-teal hover:bg-transparent hover:text-kp-teal hover:underline"
              )}
              asChild
            >
              <Link href="/contacts/all">View all</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent open houses</CardTitle>
          <CardDescription>Your latest open house events</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentOpenHouses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              <span className="block">{UI_COPY.empty.noneYet("open houses")}</span>
              <span className="mt-1 block text-sm">Create one to get started.</span>
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
                    <Button variant="outline" size="sm" className={kpBtnSecondary} asChild>
                      <Link href={showingHqOpenHouseWorkspaceHref(oh.id)}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button className={cn(kpBtnSecondary, "mt-4")} variant="outline" asChild>
            <Link href="/open-houses">All open houses</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
