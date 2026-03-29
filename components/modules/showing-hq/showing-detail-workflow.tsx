"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ShowingPrepWorkspace } from "@/components/showing-hq/showing-prep-workspace";
import { mergePrepChecklistFlags } from "@/lib/showing-hq/prep-checklist-flags";
import {
  normalizeShowingHqWorkflowTab,
  showingWorkflowTabHref,
  type ShowingHqWorkflowTab,
} from "@/lib/showing-hq/showing-workflow-hrefs";
import { ShowingBuyerAgentFeedbackDraftPanel } from "@/components/showing-hq/ShowingBuyerAgentFeedbackDraftPanel";
import { buildPropertyAddressLineForFeedbackDraft } from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";

type ShowingDetail = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  buyerName: string | null;
  notes: string | null;
  feedbackRequired: boolean;
  feedbackRequestStatus: string | null;
  feedbackDraftGeneratedAt?: string | null;
  feedbackEmailSentAt?: string | null;
  prepChecklistFlags?: Record<string, unknown> | null;
  buyerAgentEmailReplyAt?: string | null;
  buyerAgentEmailReplyFrom?: string | null;
  buyerAgentEmailReplyRaw?: string | null;
  buyerAgentEmailReplyParsed?: unknown;
  property: { address1: string; city: string; state: string; zip?: string | null };
};

function hasBuyerAgentEmailDraft(s: ShowingDetail): boolean {
  return !!(s.feedbackDraftGeneratedAt && s.buyerAgentEmail?.trim());
}

function emailReplyExcerpt(raw: string | null | undefined, max = 240): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const TAB_SPECS: { id: ShowingHqWorkflowTab; label: string }[] = [
  { id: "prep", label: "Prep" },
  { id: "feedback", label: "Feedback" },
  { id: "details", label: "Details" },
];

export function ShowingDetailWorkflow() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tab = normalizeShowingHqWorkflowTab(searchParams.get("tab"));

  const setTab = useCallback(
    (t: ShowingHqWorkflowTab) => {
      router.replace(showingWorkflowTabHref(id, t), { scroll: false });
    },
    [router, id]
  );

  const [data, setData] = useState<ShowingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [sendSaving, setSendSaving] = useState(false);
  const [sendAttempted, setSendAttempted] = useState(false);

  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [buyerAgentName, setBuyerAgentName] = useState("");
  const [buyerAgentEmail, setBuyerAgentEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{
    buyerAgentName?: string;
    buyerAgentEmail?: string;
  }>({});

  const load = useCallback(() => {
    if (!id) return;
    setError(null);
    setLoading(true);
    fetch(`/api/v1/showing-hq/showings/${id}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          data?: ShowingDetail;
        };
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Showing not found");
        }
        return json.data ?? null;
      })
      .then((row) => {
        setData(row);
        if (row) {
          const dt = new Date(row.scheduledAt);
          setDateStr(
            `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
          );
          setTimeStr(
            `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
          );
          setBuyerAgentName(row.buyerAgentName?.trim() ?? "");
          setBuyerAgentEmail(row.buyerAgentEmail?.trim() ?? "");
          setNotes(row.notes ?? "");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const draftPreviewScheduledAt = useMemo(() => {
    if (!dateStr || !timeStr) return data?.scheduledAt ?? new Date().toISOString();
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(dateStr);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d.toISOString();
  }, [dateStr, timeStr, data?.scheduledAt]);

  const onPrepWorkspaceUpdated = useCallback((json: { data: ShowingDetail }) => {
    setData(json.data);
    setBuyerAgentName(json.data.buyerAgentName?.trim() ?? "");
    setBuyerAgentEmail(json.data.buyerAgentEmail?.trim() ?? "");
    setNotes(json.data.notes ?? "");
  }, []);

  async function saveDetails() {
    if (!data || !dateStr || !timeStr) {
      setError("Date and time are required.");
      return;
    }
    const [h, m] = timeStr.split(":").map(Number);
    const scheduledAt = new Date(dateStr);
    scheduledAt.setHours(h ?? 0, m ?? 0, 0, 0);
    setDetailsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          notes: notes.trim() ? notes : null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setDetailsSaving(false);
    }
  }

  function validateFeedbackSend(): boolean {
    const err: typeof fieldErrors = {};
    if (!buyerAgentName.trim()) err.buyerAgentName = "Required before sending.";
    const em = buyerAgentEmail.trim();
    if (!em) err.buyerAgentEmail = "Required before sending.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      err.buyerAgentEmail = "Enter a valid email address.";
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  }

  async function sendFeedbackRequest() {
    setSendAttempted(true);
    if (!data || !dateStr || !timeStr) {
      setError("Date and time are required.");
      return;
    }
    if (!validateFeedbackSend()) return;
    const [h, m] = timeStr.split(":").map(Number);
    const scheduledAt = new Date(dateStr);
    scheduledAt.setHours(h ?? 0, m ?? 0, 0, 0);

    setSendSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledAt.toISOString(),
          buyerAgentName: buyerAgentName.trim(),
          buyerAgentEmail: buyerAgentEmail.trim(),
          notes: notes.trim() ? notes : null,
          feedbackRequestStatus: "SENT",
          prepChecklistFlags: mergePrepChecklistFlags(data.prepChecklistFlags, {}),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData(json.data);
      setFieldErrors({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSendSaving(false);
    }
  }

  if (loading && !data) return <PageLoading message="Loading showing…" />;
  if (error && !data) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null);
          load();
        }}
      />
    );
  }
  if (!data) return null;

  const addressLine = buildPropertyAddressLineForFeedbackDraft(data.property);
  const hasDraft = hasBuyerAgentEmailDraft({
    ...data,
    buyerAgentEmail: buyerAgentEmail || data.buyerAgentEmail,
  } as ShowingDetail);
  const feedbackSent = data.feedbackRequestStatus === "SENT";
  const feedbackReceived =
    data.feedbackRequestStatus === "RECEIVED" || Boolean(data.buyerAgentEmailReplyAt);
  const showNextSendCta = hasDraft && !feedbackSent && !feedbackReceived;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")} asChild>
            <Link href="/showing-hq/showings">
              <ArrowLeft className="h-4 w-4" />
              Showings
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">Private showing</h1>
            <p className="text-sm text-kp-on-surface-variant">{addressLine}</p>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/80">
              Workspace — fields on Prep and Feedback save as you go or when you click save actions.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-kp-outline/70 pb-0.5">
        {TAB_SPECS.map(({ id: tid, label }) => (
          <button
            key={tid}
            type="button"
            onClick={() => setTab(tid)}
            className={cn(
              "rounded-t-md px-3 py-2 text-xs font-semibold transition-colors",
              tab === tid
                ? "bg-kp-surface-high text-kp-on-surface"
                : "text-kp-on-surface-variant hover:bg-kp-surface-high/50 hover:text-kp-on-surface"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "prep" && (
        <div className="space-y-6">
          <ShowingPrepWorkspace
            source={{
              id: data.id,
              feedbackRequired: data.feedbackRequired,
              feedbackDraftGeneratedAt: data.feedbackDraftGeneratedAt,
              prepChecklistFlags: data.prepChecklistFlags,
              buyerAgentName: data.buyerAgentName,
              buyerAgentEmail: data.buyerAgentEmail,
              notes: data.notes,
            }}
            onUpdated={onPrepWorkspaceUpdated}
          />

          <div className="rounded-xl border border-kp-outline/80 bg-kp-surface-high/15 p-4">
            <h2 className="text-sm font-semibold text-kp-on-surface">Next steps</h2>
            {showNextSendCta ? (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-kp-on-surface-variant">
                  Buyer agent draft is ready — send the feedback request from the Feedback tab.
                </p>
                <Button
                  type="button"
                  className={cn(kpBtnPrimary, "h-9 border-transparent text-sm font-semibold")}
                  onClick={() => setTab("feedback")}
                >
                  Send feedback request
                </Button>
              </div>
            ) : feedbackSent && !feedbackReceived ? (
              <p className="mt-2 text-xs text-amber-200/90">
                Waiting on response — you emailed the buyer agent and haven&apos;t marked a reply yet.
              </p>
            ) : feedbackReceived ? (
              <p className="mt-2 text-xs text-emerald-400/90">Feedback received — review the Feedback tab for details.</p>
            ) : (
              <p className="mt-2 text-xs text-kp-on-surface-variant">
                Finish prep above, then move to Feedback when your draft is ready.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-kp-outline/60 bg-kp-bg/20 p-4">
            <h2 className="text-sm font-semibold text-kp-on-surface">Activity</h2>
            <ul className="mt-2 space-y-2 text-xs text-kp-on-surface-variant">
              <li className="flex gap-2">
                <span className="font-medium text-kp-on-surface">Scheduled</span>
                <span>
                  {new Date(data.scheduledAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </li>
              {data.feedbackEmailSentAt ? (
                <li className="flex gap-2">
                  <span className="font-medium text-kp-on-surface">Feedback request sent</span>
                  <span>
                    {new Date(data.feedbackEmailSentAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      )}

      {tab === "feedback" && (
        <div className="space-y-6">
          {data.buyerAgentEmailReplyAt ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/90">
                Buyer agent reply (email)
              </p>
              <p className="mt-1 text-[11px] text-kp-on-surface-variant">
                Received{" "}
                {new Date(data.buyerAgentEmailReplyAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {data.buyerAgentEmailReplyFrom ? ` · ${data.buyerAgentEmailReplyFrom}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-kp-on-surface">
                {emailReplyExcerpt(data.buyerAgentEmailReplyRaw)}
              </p>
            </div>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-kp-on-surface">Buyer agent info</h2>
            <p className="text-[11px] text-kp-on-surface-variant">Editable — saved with Mark as sent or from Prep.</p>
            <div className="space-y-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant" htmlFor="wf-ba-name">
                  Name
                </label>
                <input
                  id="wf-ba-name"
                  type="text"
                  value={buyerAgentName}
                  onChange={(e) => {
                    setBuyerAgentName(e.target.value);
                    setFieldErrors((f) => ({ ...f, buyerAgentName: undefined }));
                  }}
                  className={cn(
                    "h-9 w-full max-w-md rounded-lg border bg-kp-surface-high px-3 text-sm text-kp-on-surface",
                    fieldErrors.buyerAgentName ? "border-red-500/60" : "border-kp-outline"
                  )}
                />
                {fieldErrors.buyerAgentName ? (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.buyerAgentName}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant" htmlFor="wf-ba-email">
                  Email
                </label>
                <input
                  id="wf-ba-email"
                  type="email"
                  value={buyerAgentEmail}
                  onChange={(e) => {
                    setBuyerAgentEmail(e.target.value);
                    setFieldErrors((f) => ({ ...f, buyerAgentEmail: undefined }));
                  }}
                  className={cn(
                    "h-9 w-full max-w-md rounded-lg border bg-kp-surface-high px-3 text-sm text-kp-on-surface",
                    fieldErrors.buyerAgentEmail ? "border-red-500/60" : "border-kp-outline"
                  )}
                />
                {fieldErrors.buyerAgentEmail ? (
                  <p className="mt-1 text-xs text-red-400">{fieldErrors.buyerAgentEmail}</p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant" htmlFor="wf-notes">
                  Notes
                </label>
                <textarea
                  id="wf-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full max-w-xl rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface"
                />
              </div>
            </div>
          </section>

          {sendAttempted && (fieldErrors.buyerAgentName || fieldErrors.buyerAgentEmail) ? (
            <p className="text-sm font-medium text-red-400">Required before sending.</p>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-kp-on-surface">Email preview</h2>
            <ShowingBuyerAgentFeedbackDraftPanel
              variant="kp"
              footerMode="page"
              draftSource={{
                propertyAddressLine: buildPropertyAddressLineForFeedbackDraft(data.property),
                scheduledAt: draftPreviewScheduledAt,
                buyerAgentName: buyerAgentName.trim() || data.buyerAgentName,
              }}
              generatedAt={data.feedbackDraftGeneratedAt}
              buyerAgentEmail={buyerAgentEmail.trim() || data.buyerAgentEmail}
            />
          </section>

          {hasDraft && data.feedbackRequestStatus !== "SENT" && data.feedbackRequestStatus !== "RECEIVED" ? (
            <section className="rounded-lg border border-kp-outline/80 bg-kp-surface-high/20 p-4">
              <h2 className="text-sm font-semibold text-kp-on-surface">Actions</h2>
              <p className="mt-1 text-[11px] text-kp-on-surface-variant">
                Use Open mail or Copy body from the preview above, then confirm below.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={cn(kpBtnPrimary, "h-9 border-transparent px-4 text-sm font-semibold")}
                  disabled={sendSaving}
                  onClick={() => void sendFeedbackRequest()}
                >
                  {sendSaving ? "Updating…" : "Mark as sent"}
                </Button>
              </div>
            </section>
          ) : null}

          {data.feedbackRequestStatus === "SENT" || data.feedbackRequestStatus === "RECEIVED" ? (
            <p className="text-xs text-kp-on-surface-variant">
              Feedback request already marked as sent or received. Use Prep or Details for other edits.
            </p>
          ) : null}

          {!data.feedbackDraftGeneratedAt ? (
            <p className="text-xs text-kp-on-surface-variant">
              A draft is generated after the visit is logged — if you do not see a preview yet, check Supra inbox or add
              the showing manually.
            </p>
          ) : null}
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-4">
          <p className="text-xs text-kp-on-surface-variant">
            Schedule and notes — use Save when you&apos;re done editing this tab.
          </p>
          <div className="space-y-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">Schedule</p>
            <div className="grid max-w-md grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Date</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Time</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full max-w-xl rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface"
              />
            </div>
          </div>
          <div
            className={cn(
              "sticky bottom-4 z-10 flex justify-end rounded-lg border border-kp-outline/70 bg-kp-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            )}
          >
            <Button
              type="button"
              variant="outline"
              className={cn(kpBtnSecondary, "h-9 text-sm")}
              disabled={detailsSaving}
              onClick={() => void saveDetails()}
            >
              {detailsSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
