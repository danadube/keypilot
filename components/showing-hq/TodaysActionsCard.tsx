"use client";

import Link from "next/link";
import {
  MessageSquare,
  Users,
  CalendarCheck,
  FileText,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSave } from "@/components/ui/kp-dashboard-button-tiers";

export type TodaysActionItem = {
  id: string;
  description: string;
  propertyOrAddress: string;
  actionLabel: string;
  actionHref: string;
  type: "feedback" | "follow_up" | "confirm_showing" | "report";
};

const ICON_MAP: Record<TodaysActionItem["type"], LucideIcon> = {
  feedback: MessageSquare,
  follow_up: Users,
  confirm_showing: CalendarCheck,
  report: FileText,
};

type TodaysActionsCardProps = {
  items: TodaysActionItem[];
};

export function TodaysActionsCard({ items }: TodaysActionsCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-kp-outline bg-kp-surface p-4">
      <div className="mb-3 border-b border-kp-outline pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-kp-on-surface">
          Today&apos;s Actions
        </h2>
        <p className="mt-0.5 text-xs text-kp-on-surface-variant">
          Tasks that need your attention today.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="py-4 text-center text-xs text-kp-on-surface-variant">
          No actions due today. You&apos;re all set.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.type];
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border-b border-kp-outline py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-kp-on-surface">
                    <Icon className="h-4 w-4 shrink-0 text-[#4BAED8]" />
                    <span className="truncate">{item.description}</span>
                  </p>
                  {item.propertyOrAddress ? (
                    <p className="mt-0.5 truncate pl-6 text-xs text-kp-on-surface-variant">
                      {item.propertyOrAddress}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSave, "shrink-0 border-transparent")}
                  asChild
                >
                  <Link href={item.actionHref}>
                    {item.actionLabel}
                    <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
