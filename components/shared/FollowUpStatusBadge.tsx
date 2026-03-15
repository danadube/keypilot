"use client";

import { Badge } from "@/components/ui/badge";

export type FollowUpStatus = "DRAFT" | "REVIEWED" | "SENT_MANUAL" | "ARCHIVED";

const LABELS: Record<FollowUpStatus, string> = {
  DRAFT: "Draft ready",
  REVIEWED: "Reviewed",
  SENT_MANUAL: "Sent",
  ARCHIVED: "Dismissed",
};

const VARIANT: Record<FollowUpStatus, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  REVIEWED: "default",
  SENT_MANUAL: "default",
  ARCHIVED: "outline",
};

type FollowUpStatusBadgeProps = {
  status: string;
  className?: string;
};

export function FollowUpStatusBadge({ status, className }: FollowUpStatusBadgeProps) {
  const s = status as FollowUpStatus;
  const label = LABELS[s] ?? status;
  const variant = VARIANT[s] ?? "outline";
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
