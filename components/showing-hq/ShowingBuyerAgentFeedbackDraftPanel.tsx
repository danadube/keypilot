"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  generateShowingBuyerAgentFeedbackDraft,
  type BuyerAgentFeedbackGreetingMode,
} from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";

/** Browsers and mail clients vary; very long mailto URLs may be truncated or ignored. */
export const BUYER_AGENT_FEEDBACK_MAILTO_MAX_LENGTH = 1950;

/**
 * Build a mailto: URL using percent-encoding (%20 for spaces).
 * `URLSearchParams` uses `+` for spaces (x-www-form-urlencoded), which some mail
 * clients (e.g. Spark) surface literally in the composed subject/body.
 */
export function buildBuyerAgentFeedbackMailtoHref(
  recipient: string,
  subject: string,
  body: string
): string | null {
  const to = recipient.trim();
  if (!to || !subject.trim() || !body.trim()) return null;
  const qSub = encodeURIComponent(subject);
  const qBody = encodeURIComponent(body);
  return `mailto:${encodeURIComponent(to)}?subject=${qSub}&body=${qBody}`;
}

export type BuyerAgentFeedbackDraftSource = {
  propertyAddressLine: string;
  /** ISO 8601 */
  scheduledAt: string;
  buyerAgentName: string | null;
};

export type ShowingBuyerAgentFeedbackDraftProps = {
  /** Always derive subject/body from this via the shared generator (never stale DB text). */
  draftSource: BuyerAgentFeedbackDraftSource;
  generatedAt: string | null | undefined;
  /** Required to enable “Create email” (mailto). */
  buyerAgentEmail?: string | null | undefined;
  /** When present, shows “Mark as sent” to clear DRAFT_READY from dashboards. */
  showingId?: string | null | undefined;
  /** Called after default PATCH succeeds (omit if `onMarkAsSent` handles refresh/close). */
  onMarkedSent?: () => void;
  /**
   * When set, “Mark as sent” uses this instead of PATCHing only status (e.g. parent saves form + SENT).
   * Provide `markingSent` while the promise is in flight.
   */
  onMarkAsSent?: () => void | Promise<void>;
  markingSent?: boolean;
  className?: string;
  /** Calendar BrandModal uses theme vars; showings list uses kp tokens */
  variant?: "kp" | "brand";
};

const GREETING_OPTIONS: { value: BuyerAgentFeedbackGreetingMode; label: string }[] = [
  { value: "firstName", label: "First name" },
  { value: "fullName", label: "Full name" },
  { value: "generic", label: "Generic" },
];

/**
 * Buyer-agent feedback request: preview, greeting control, mailto, copy, mark sent.
 */
export function ShowingBuyerAgentFeedbackDraftPanel({
  draftSource,
  generatedAt,
  buyerAgentEmail,
  showingId,
  onMarkedSent,
  onMarkAsSent,
  markingSent: markingSentProp,
  className,
  variant = "kp",
}: ShowingBuyerAgentFeedbackDraftProps) {
  const [greetingMode, setGreetingMode] = useState<BuyerAgentFeedbackGreetingMode>("firstName");
  const [copied, setCopied] = useState<null | "body">(null);
  const [markingSentInternal, setMarkingSentInternal] = useState(false);
  const [nudgeMarkSent, setNudgeMarkSent] = useState(false);

  const parentMarksSent = onMarkAsSent != null;
  const markingSent = parentMarksSent ? Boolean(markingSentProp) : markingSentInternal;

  const { subject: sub, body: bod } = useMemo(() => {
    const line = draftSource.propertyAddressLine?.trim() ?? "";
    const at = draftSource.scheduledAt?.trim() ?? "";
    if (!line || !at) return { subject: "", body: "" };
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return { subject: "", body: "" };
    return generateShowingBuyerAgentFeedbackDraft({
      propertyAddressLine: line,
      scheduledAt: d,
      buyerAgentName: draftSource.buyerAgentName,
      greetingMode,
    });
  }, [draftSource.propertyAddressLine, draftSource.scheduledAt, draftSource.buyerAgentName, greetingMode]);

  useEffect(() => {
    if (!nudgeMarkSent) return;
    const t = window.setTimeout(() => setNudgeMarkSent(false), 10000);
    return () => window.clearTimeout(t);
  }, [nudgeMarkSent]);

  const to = buyerAgentEmail?.trim() ?? "";
  if (!sub.trim() || !bod.trim()) return null;

  const mailtoHref = to ? buildBuyerAgentFeedbackMailtoHref(to, sub, bod) : null;
  const mailtoTooLong = mailtoHref != null && mailtoHref.length > BUYER_AGENT_FEEDBACK_MAILTO_MAX_LENGTH;

  const copyBody = () => {
    void navigator.clipboard.writeText(bod).then(() => {
      setCopied("body");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleCreateEmailClick = () => {
    setNudgeMarkSent(true);
  };

  const markSent = async () => {
    if (parentMarksSent) {
      await onMarkAsSent();
      return;
    }
    const id = showingId?.trim();
    if (!id) return;
    setMarkingSentInternal(true);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackRequestStatus: "SENT" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      onMarkedSent?.();
    } catch {
      /* non-fatal */
    } finally {
      setMarkingSentInternal(false);
    }
  };

  const genLabel =
    generatedAt != null && String(generatedAt).length > 0
      ? new Date(generatedAt as string).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const shell =
    variant === "brand"
      ? "border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/30"
      : "border-kp-outline bg-kp-surface-high/50";

  const titleCls =
    variant === "brand" ? "text-[var(--brand-text)]" : "text-kp-on-surface";
  const mutedCls =
    variant === "brand" ? "text-[var(--brand-text-muted)]" : "text-kp-on-surface-variant";
  const iconCls =
    variant === "brand" ? "text-[var(--brand-primary)]" : "text-kp-teal";

  const btnOutline =
    variant === "brand"
      ? "border-[var(--brand-border)] text-[var(--brand-text)] hover:bg-[var(--brand-surface-alt)]"
      : "";

  const selectTriggerCls =
    variant === "brand"
      ? "h-8 border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/20 text-xs text-[var(--brand-text)]"
      : "h-8 border-kp-outline bg-kp-surface-high text-xs";

  return (
    <div className={cn("rounded-lg border p-3", shell, className)}>
      <div className={cn("flex items-center gap-2 text-sm font-semibold", titleCls)}>
        <Mail className={cn("h-4 w-4 shrink-0", iconCls)} />
        Feedback request
      </div>
      <p className={cn("mt-1 text-xs leading-snug", mutedCls)}>
        Review the email below, send it from your mail app, then mark it sent so dashboards stay accurate.
      </p>
      {genLabel && <p className={cn("mt-1 text-xs", mutedCls)}>Draft last saved {genLabel}</p>}
      {to && (
        <p className={cn("mt-1 truncate text-xs", mutedCls)} title={to}>
          To: {to}
        </p>
      )}

      <div className="mt-3 space-y-1.5">
        <Label
          htmlFor="buyer-agent-feedback-greeting"
          className={cn("text-xs font-medium uppercase tracking-wide", mutedCls)}
        >
          Greeting
        </Label>
        <Select
          value={greetingMode}
          onValueChange={(v) => setGreetingMode(v as BuyerAgentFeedbackGreetingMode)}
        >
          <SelectTrigger id="buyer-agent-feedback-greeting" className={selectTriggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GREETING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className={cn("mt-3 text-xs font-medium uppercase tracking-wide", mutedCls)}>Subject</p>
      <p className={cn("mt-0.5 text-sm", titleCls)}>{sub}</p>

      <p className={cn("mt-3 text-xs font-medium uppercase tracking-wide", mutedCls)}>Body preview</p>
      <pre
        className={cn(
          "mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md p-2 text-sm leading-relaxed",
          variant === "brand"
            ? "border border-[var(--brand-border)]/60 bg-black/10 text-[var(--brand-text)]"
            : "border border-kp-outline/40 bg-kp-bg/30 text-kp-on-surface"
        )}
      >
        {bod}
      </pre>

      <p className={cn("mt-4 text-xs font-semibold uppercase tracking-wide", mutedCls)}>Actions</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {mailtoHref && !mailtoTooLong && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(
              kpBtnPrimary,
              "border-transparent h-8 gap-1.5 text-xs font-semibold"
            )}
          >
            <a href={mailtoHref} onClick={handleCreateEmailClick}>
              <Send className="h-3.5 w-3.5" />
              Create email
            </a>
          </Button>
        )}
        {mailtoHref && mailtoTooLong && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(kpBtnPrimary, "border-transparent h-8 text-xs opacity-60")}
            disabled
            title="This draft is too long for a mailto link on some systems. Use copy actions below."
          >
            <Send className="h-3.5 w-3.5" />
            Create email
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 text-xs",
            variant === "brand" ? btnOutline : kpBtnSecondary
          )}
          onClick={copyBody}
        >
          {copied === "body" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied === "body" ? "Copied" : "Copy body"}</span>
        </Button>

        {showingId?.trim() || parentMarksSent ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-8 text-xs",
              variant === "brand" ? btnOutline : kpBtnSecondary,
              nudgeMarkSent && "ring-2 ring-amber-500/80 ring-offset-2 ring-offset-kp-surface"
            )}
            disabled={markingSent}
            onClick={() => void markSent()}
          >
            {markingSent ? "Updating…" : "Mark as sent"}
          </Button>
        ) : null}
      </div>
      {nudgeMarkSent ? (
        <p
          className={cn(
            "mt-2 text-[11px] leading-snug text-amber-600/90 dark:text-amber-400/90",
            variant === "kp" && "text-amber-500/95"
          )}
        >
          After sending from your email app, click &quot;Mark as sent&quot; to complete.
        </p>
      ) : (
        (showingId?.trim() || parentMarksSent) && (
          <p className={cn("mt-2 text-[11px] leading-snug", mutedCls)}>
          You can mark as sent anytime after the email goes out—even if you didn&apos;t use Create email.
          </p>
        )
      )}
    </div>
  );
}
