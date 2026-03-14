"use client";

import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { cn } from "@/lib/utils";

export type EmailStatus = "needs_reply" | "informational" | "waiting";

export interface PriorityEmail {
  id: string;
  sender: string;
  subject: string;
  aiSummary?: string;
  status: EmailStatus;
  date?: string;
  href?: string;
}

const STATUS_CONFIG: Record<
  EmailStatus,
  { label: string; tone: "danger" | "default" | "warning" }
> = {
  needs_reply: { label: "Needs Reply", tone: "danger" },
  informational: { label: "Informational", tone: "default" },
  waiting: { label: "Waiting", tone: "warning" },
};

export interface PriorityEmailCardProps {
  email: PriorityEmail;
  className?: string;
}

export function PriorityEmailCard({ email, className }: PriorityEmailCardProps) {
  const config = STATUS_CONFIG[email.status];
  const content = (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--brand-border)] p-4 transition-colors hover:bg-[var(--brand-surface-alt)]",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-[var(--brand-text)] text-sm truncate">
            {email.sender}
          </p>
          <BrandBadge tone={config.tone}>{config.label}</BrandBadge>
        </div>
        <p className="font-medium text-[var(--brand-text)] text-sm mt-1 line-clamp-1">
          {email.subject}
        </p>
        {email.aiSummary && (
          <p className="text-xs text-[var(--brand-text-muted)] mt-1 line-clamp-2">
            {email.aiSummary}
          </p>
        )}
        {email.date && (
          <p className="text-[10px] text-[var(--brand-text-muted)] mt-1">
            {email.date}
          </p>
        )}
      </div>
      {email.href ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]" />
      ) : (
        <Mail className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]" />
      )}
    </div>
  );

  return email.href ? (
    <Link href={email.href} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}
