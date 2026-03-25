"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShowingBuyerAgentFeedbackDraftProps = {
  subject: string | null | undefined;
  body: string | null | undefined;
  generatedAt: string | null | undefined;
  className?: string;
  /** Calendar BrandModal uses theme vars; showings list uses kp tokens */
  variant?: "kp" | "brand";
};

/**
 * Read-only buyer-agent feedback email draft with copy actions (v1 — no send).
 */
export function ShowingBuyerAgentFeedbackDraftPanel({
  subject,
  body,
  generatedAt,
  className,
  variant = "kp",
}: ShowingBuyerAgentFeedbackDraftProps) {
  const [copied, setCopied] = useState<null | "subject" | "body" | "both">(null);

  const sub = subject?.trim() ?? "";
  const bod = body?.trim() ?? "";
  if (!sub || !bod) return null;

  const copy = (kind: "subject" | "body" | "both") => {
    const text = kind === "subject" ? sub : kind === "body" ? bod : `${sub}\n\n${bod}`;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
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

  return (
    <div className={cn("rounded-lg border p-3", shell, className)}>
      <div className={cn("flex items-center gap-2 text-sm font-medium", titleCls)}>
        <Mail className={cn("h-4 w-4 shrink-0", iconCls)} />
        Buyer-agent feedback email
      </div>
      {genLabel && <p className={cn("mt-1 text-xs", mutedCls)}>Generated {genLabel}</p>}

      <p className={cn("mt-2 text-xs font-medium uppercase tracking-wide", mutedCls)}>Subject</p>
      <p className={cn("mt-0.5 text-sm", titleCls)}>{sub}</p>

      <p className={cn("mt-3 text-xs font-medium uppercase tracking-wide", mutedCls)}>Body</p>
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

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs", btnOutline)}
          onClick={() => copy("subject")}
        >
          {copied === "subject" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied === "subject" ? "Copied" : "Copy subject"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs", btnOutline)}
          onClick={() => copy("body")}
        >
          {copied === "body" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied === "body" ? "Copied" : "Copy body"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-8 text-xs", btnOutline)}
          onClick={() => copy("both")}
        >
          {copied === "both" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied === "both" ? "Copied" : "Copy subject + body"}</span>
        </Button>
      </div>
    </div>
  );
}
