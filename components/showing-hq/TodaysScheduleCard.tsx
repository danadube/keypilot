"use client";

import Link from "next/link";
import { Calendar, CheckSquare, Building2 } from "lucide-react";
import { BrandCard } from "@/components/ui/BrandCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type ScheduleItem = {
  type: "open_house" | "showing";
  id: string;
  title: string;
  at: string;
  property: { address1: string; city: string; state?: string };
  status?: string;
};

type TodaysScheduleCardProps = {
  scheduleItems: ScheduleItem[];
  followUpCount: number;
  formatTime: (d: string) => string;
};

export function TodaysScheduleCard({
  scheduleItems,
  followUpCount,
  formatTime,
}: TodaysScheduleCardProps) {
  const hasItems = scheduleItems.length > 0 || followUpCount > 0;

  return (
    <BrandCard padded className="flex h-full min-h-0 flex-col bg-white">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
        <Calendar className="h-4 w-4 text-[var(--brand-primary)]" />
        Today&apos;s Schedule
      </h2>
      {hasItems ? (
        <ul className="flex flex-1 flex-col gap-2 overflow-auto">
          {scheduleItems.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className={`flex items-start justify-between gap-2 rounded-lg border p-2.5 ${
                item.type === "open_house"
                  ? "border-blue-200/80 bg-blue-50/50"
                  : "border-amber-200/80 bg-amber-50/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[var(--brand-text-muted)]">
                  {formatTime(item.at)}
                </p>
                <p className="truncate font-medium text-[var(--brand-text)]">
                  {item.title}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-[var(--brand-text-muted)]">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {item.property.address1}, {item.property.city}
                </p>
              </div>
              <Badge
                variant={item.type === "open_house" ? "default" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {item.type === "open_house" ? "Open house" : "Showing"}
              </Badge>
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
          ))}
          {followUpCount > 0 && (
            <li className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--brand-text)]">
                  Follow-up reminders
                </p>
                <p className="text-xs text-[var(--brand-text-muted)]">
                  {followUpCount} draft{followUpCount !== 1 ? "s" : ""} ready to review
                </p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] border-amber-300 text-amber-800"
              >
                Follow-up
              </Badge>
              <Button variant="outline" size="sm" className="h-7 shrink-0 text-xs" asChild>
                <Link href="/showing-hq/follow-ups">
                  <CheckSquare className="mr-1 h-3 w-3" />
                  Review
                </Link>
              </Button>
            </li>
          )}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/20 px-4 py-8 text-center">
          <p className="text-sm text-[var(--brand-text-muted)]">
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
