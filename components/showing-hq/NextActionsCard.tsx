"use client";

import Link from "next/link";
import { Clock, CheckSquare, Users, MessageSquare } from "lucide-react";
import { BrandCard } from "@/components/ui/BrandCard";
import { Button } from "@/components/ui/button";

export type NextActionItem = {
  id: string;
  label: string;
  href: string;
  icon: "clock" | "check" | "users" | "message";
};

type NextActionsCardProps = {
  items: NextActionItem[];
};

const iconMap = {
  clock: Clock,
  check: CheckSquare,
  users: Users,
  message: MessageSquare,
};

export function NextActionsCard({ items }: NextActionsCardProps) {
  return (
    <BrandCard className="flex h-full min-h-0 flex-col bg-white p-4">
      <h2 className="mb-2 text-sm font-semibold text-[var(--brand-text)]">
        Next Actions
      </h2>
      {items.length > 0 ? (
        <ul className="flex flex-1 flex-col gap-1.5 overflow-auto">
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 py-2 text-left text-xs font-medium text-[var(--brand-text)] hover:bg-slate-100"
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)]" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="text-xs font-medium text-[var(--brand-text-muted)]">
            You&apos;re all caught up
          </p>
        </div>
      )}
    </BrandCard>
  );
}
