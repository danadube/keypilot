"use client";

/**
 * Expandable section for AI suggested reply drafts.
 * Lazy-loads drafts when expanded. Review-first: no send.
 * Reusable for Priority Emails, future inbox, contact pages.
 */

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Copy, Loader2, MessageSquare } from "lucide-react";
import { BrandButton } from "@/components/ui/BrandButton";
import { cn } from "@/lib/utils";

export type SuggestedReplyDraft = {
  id: string;
  emailId: string;
  threadId: string;
  draftType: "short" | "polished";
  body: string;
  subjectSuggestion?: string;
  rationale?: string;
  suggestedAt: string;
};

export type EmailContextForDraft = {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  aiSummary?: string;
};

interface SuggestedReplySectionProps {
  email: EmailContextForDraft;
  className?: string;
}

export function SuggestedReplySection({ email, className }: SuggestedReplySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [drafts, setDrafts] = useState<SuggestedReplyDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/reply-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          threadId: email.threadId,
          sender: email.sender,
          subject: email.subject,
          snippet: email.snippet,
          aiSummary: email.aiSummary,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setDrafts(json.data?.drafts ?? []);
    } catch (err) {
      setError((err as Error).message ?? "Failed to generate");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && drafts.length === 0 && !loading) fetchDrafts();
  };

  const handleCopy = (body: string, id: string) => {
    void navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className={cn("mt-2", className)}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {expanded ? "Hide suggested reply" : "Suggested reply"}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] p-3 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--brand-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </div>
          )}

          {error && (
            <p className="text-xs text-[var(--brand-danger)]">{error}</p>
          )}

          {!loading && drafts.length === 0 && !error && (
            <p className="text-xs text-[var(--brand-text-muted)]">No drafts generated.</p>
          )}

          {!loading && drafts.length > 0 && (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-medium uppercase text-[var(--brand-text-muted)]">
                      {draft.draftType}
                    </span>
                    <BrandButton
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleCopy(draft.body, draft.id)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedId === draft.id ? "Copied" : "Copy"}
                    </BrandButton>
                  </div>
                  {draft.rationale && (
                    <p className="text-[11px] text-[var(--brand-text-muted)] mb-1.5 italic">
                      {draft.rationale}
                    </p>
                  )}
                  <p className="text-sm text-[var(--brand-text)] whitespace-pre-wrap">
                    {draft.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
