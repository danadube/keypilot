"use client";

import Link from "next/link";
import { Calendar, Building2, Home } from "lucide-react";
import { BrandCard } from "@/components/ui/BrandCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ScheduleItem = {
  type: "open_house" | "showing";
  id: string;
  title: string;
  at: string;
  endAt?: string;
  property: { address1: string; city: string; state?: string };
  status?: string;
  /** When set, rendered as "Tomorrow" row */
  isTomorrow?: boolean;
};

type TodaysScheduleCardProps = {
  scheduleItems: ScheduleItem[];
  tomorrowItem?: ScheduleItem | null;
  formatTime: (d: string) => string;
  /** When set, the matching open house item shows a LIVE badge */
  activeOpenHouseId?: string | null;
};

export function TodaysScheduleCard({
  scheduleItems,
  tomorrowItem,
  formatTime,
  activeOpenHouseId = null,
}: TodaysScheduleCardProps) {
  const hasItems = scheduleItems.length > 0 || tomorrowItem != null;
  const timeRange = (at: string, endAt?: string) =>
    endAt
      ? `${formatTime(at)} – ${formatTime(endAt)}`
      : formatTime(at);

  return (
    <BrandCard className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Calendar className="h-4 w-4 text-slate-500" />
        Today&apos;s Schedule
      </h2>
      <p className="mb-3 text-[11px] text-slate-500">
        Timeline of today and next tomorrow
      </p>
      {hasItems ? (
        <ul className="flex flex-1 flex-col gap-2 overflow-auto">
          {scheduleItems.map((item) => {
            const isLive = item.type === "open_house" && activeOpenHouseId === item.id;
            return (
            <li
              key={`today-${item.type}-${item.id}`}
              className={`flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 transition-colors ${
                item.type === "open_house"
                  ? "bg-sky-50/70"
                  : "bg-amber-50/50"
              } ${isLive ? "ring-2 ring-emerald-500/60 ring-offset-1" : "hover:bg-slate-50/80"}`}
            >
              <div className="shrink-0 text-right text-xs font-medium tabular-nums text-[var(--brand-text)]" style={{ minWidth: "5rem" }}>
                {timeRange(item.at, item.endAt)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.type === "open_house" ? (
                    <Home className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  )}
                  <Badge
                    variant={item.type === "open_house" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {item.type === "open_house" ? "Open house" : "Showing"}
                  </Badge>
                  {isLive && (
                    <Badge className="bg-emerald-600 text-[10px] hover:bg-emerald-600">LIVE</Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate font-medium text-slate-800">
                  {item.property.address1}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                <Link
                  href={
                    item.type === "open_house"
                      ? `/showing-hq/open-houses/${item.id}`
                      : "/showing-hq/showings"
                  }
                >
                  View
                </Link>
              </Button>
            </li>
          );
          })}
          {tomorrowItem && (
            <li
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5"
            >
              <div className="shrink-0 text-right text-xs font-medium tabular-nums text-slate-500" style={{ minWidth: "5rem" }}>
                {timeRange(tomorrowItem.at, tomorrowItem.endAt)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {tomorrowItem.type === "open_house" ? (
                    <Home className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  )}
                  <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                    Tomorrow
                  </Badge>
                </div>
                <p className="mt-0.5 truncate font-medium text-slate-800">
                  {tomorrowItem.property.address1}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                <Link
                  href={
                    tomorrowItem.type === "open_house"
                      ? `/showing-hq/open-houses/${tomorrowItem.id}`
                      : "/showing-hq/showings"
                  }
                >
                  View
                </Link>
              </Button>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-slate-500">
            Nothing on the schedule for today.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/showing-hq/showings/new">Add showing</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/open-houses/new">Create open house</Link>
            </Button>
          </div>
        </div>
      )}
    </BrandCard>
  );
}
