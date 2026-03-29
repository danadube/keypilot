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
  className?: string;
  /** Calendar BrandModal uses theme vars; showings list uses kp tokens */
  variant?: "kp" | "brand";
  /** `page` = copy for showing detail workflow (Mark as sent below); `modal` = footer hint. */
  footerMode?: "modal" | "page";
};

const GREETING_OPTIONS: { value: BuyerAgentFeedbackGreetingMode; label: string }[] = [
  { value: "firstName", label: "First name" },
  { value: "fullName", label: "Full name" },
  { value: "generic", label: "Generic" },
];

/**
 * Buyer-agent feedback request: preview, greeting, Create email / Copy body tools only.
 * Mark-as-sent completion lives in the parent modal footer.
 */
export function ShowingBuyerAgentFeedbackDraftPanel({
  draftSource,
  generatedAt,
  buyerAgentEmail,
  className,
  variant = "kp",
  footerMode = "modal",
}: ShowingBuyerAgentFeedbackDraftProps) {
  const [greetingMode, setGreetingMode] = useState<BuyerAgentFeedbackGreetingMode>("firstName");
  const [copied, setCopied] = useState<null | "body">(null);
  const [nudgeFooterMarkSent, setNudgeFooterMarkSent] = useState(false);

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
    if (!nudgeFooterMarkSent) return;
    const t = window.setTimeout(() => setNudgeFooterMarkSent(false), 10000);
    return () => window.clearTimeout(t);
  }, [nudgeFooterMarkSent]);

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
    setNudgeFooterMarkSent(true);
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
        {footerMode === "page" ? (
          <>
            Review the draft below, then send from your mail app. Use{" "}
            <span className={cn("font-semibold", titleCls)}>Mark as sent</span> in the actions section when it&apos;s on
            its way.
          </>
        ) : (
          <>
            Review the email below and send it from your mail app. When you&apos;re done, use{" "}
            <span className={cn("font-semibold", titleCls)}>Mark as sent</span> in the modal footer to finish.
          </>
        )}
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

      <p className={cn("mt-4 text-xs font-semibold uppercase tracking-wide", mutedCls)}>Tools</p>
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
              {footerMode === "page" ? "Open mail" : "Create email"}
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
            {footerMode === "page" ? "Open mail" : "Create email"}
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
      </div>

      {footerMode === "page" ? (
        <p className={cn("mt-3 text-[11px] leading-snug", mutedCls)}>
          Copy the body if your mail app works better with paste. Mark as sent keeps your pipeline accurate.
        </p>
      ) : nudgeFooterMarkSent ? (
        <p
          className={cn(
            "mt-3 text-[11px] leading-snug text-amber-600/90 dark:text-amber-400/90",
            variant === "kp" && "text-amber-500/95"
          )}
        >
          After you send from your email app, click <strong className="font-semibold">Mark as sent</strong> in the
          footer below to complete.
        </p>
      ) : (
        <p className={cn("mt-3 text-[11px] leading-snug", mutedCls)}>
          You can use <span className={cn("font-semibold", titleCls)}>Mark as sent</span> in the footer anytime after
          the email goes out—even if you didn&apos;t use Create email.
        </p>
      )}
    </div>
  );
}
