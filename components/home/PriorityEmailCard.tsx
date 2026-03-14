"use client";

/**
 * Priority Emails — aggregates from connected inboxes.
 * For needs_reply emails: shows AI suggested reply drafts (review-first, no send).
 */

import { ChevronRight, Mail } from "lucide-react";
import Link from "next/link";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { SuggestedReplySection } from "./SuggestedReplySection";
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
  /** For needs_reply: context to generate suggested drafts */
  snippet?: string;
  threadId?: string;
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
  const canSuggestReply =
    email.status === "needs_reply" &&
    email.snippet &&
    email.threadId;

  const cardContent = (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--brand-border)]",
        email.href && "transition-colors hover:bg-[var(--brand-surface-alt)]",
        className
      )}
    >
      {email.href ? (
        <Link
          href={email.href}
          className="flex items-start justify-between gap-3 p-4 block"
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
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]" />
        </Link>
      ) : (
        <div className="flex items-start justify-between gap-3 p-4">
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
          <Mail className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]" />
        </div>
      )}
      {canSuggestReply && (
        <div className="px-4 pb-4 pt-0">
          <SuggestedReplySection
            email={{
              id: email.id,
              threadId: email.threadId!,
              sender: email.sender,
              subject: email.subject,
              snippet: email.snippet!,
              aiSummary: email.aiSummary,
            }}
          />
        </div>
      )}
    </div>
  );

  return cardContent;
}
