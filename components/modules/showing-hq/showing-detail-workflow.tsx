"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnDangerSecondary,
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { BrandModal } from "@/components/ui/BrandModal";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ShowingPrepWorkspace } from "@/components/showing-hq/showing-prep-workspace";
import { mergePrepChecklistFlags } from "@/lib/showing-hq/prep-checklist-flags";
import {
  normalizeShowingHqWorkflowTab,
  showingWorkflowTabHref,
  type ShowingHqWorkflowTab,
} from "@/lib/showing-hq/showing-workflow-hrefs";
import { UI_COPY } from "@/lib/ui-copy";
import { ShowingBuyerAgentFeedbackDraftPanel } from "@/components/showing-hq/ShowingBuyerAgentFeedbackDraftPanel";
import { ShowingHqWorkflowTabStrip } from "@/components/showing-hq/ShowingHqWorkflowTabStrip";
import { buildPropertyAddressLineForFeedbackDraft } from "@/lib/showing-hq/buyer-agent-feedback-draft-generate";
import {
  DateInputField,
  TimeInputField,
  TimeQuickChips,
  DateTimeFieldGroup,
} from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  combineLocalDateAndTimeToIso,
  isoToLocalDateInput,
  isoToLocalTimeInput,
} from "@/lib/datetime/local-scheduling";
import { AF, afError } from "@/lib/ui/action-feedback";
import { InlineSuccessText, useFlashSuccess } from "@/components/ui/action-feedback";

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
  usage?: { feedbackRequests: number; feedbackRequestsPending: number };
};

function hasBuyerAgentEmailDraft(s: ShowingDetail): boolean {
  return !!(s.feedbackDraftGeneratedAt && s.buyerAgentEmail?.trim());
}

function emailReplyExcerpt(raw: string | null | undefined, max = 240): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

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
  const { visible: detailsSavedVisible, flash: flashDetailsSaved } = useFlashSuccess();
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<"archive" | "delete" | null>(null);

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
          setDateStr(isoToLocalDateInput(row.scheduledAt));
          setTimeStr(isoToLocalTimeInput(row.scheduledAt));
          setBuyerAgentName(row.buyerAgentName?.trim() ?? "");
          setBuyerAgentEmail(row.buyerAgentEmail?.trim() ?? "");
          setNotes(row.notes ?? "");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : UI_COPY.errors.load("showing")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const draftPreviewScheduledAt = useMemo(() => {
    const merged = combineLocalDateAndTimeToIso(dateStr, timeStr);
    if (merged) return merged;
    return data?.scheduledAt ?? new Date().toISOString();
  }, [dateStr, timeStr, data?.scheduledAt]);

  const onPrepWorkspaceUpdated = useCallback((json: { data: ShowingDetail }) => {
    setData((prev) =>
      json.data
        ? {
            ...json.data,
            usage: json.data.usage ?? prev?.usage,
          }
        : prev
    );
    if (json.data) {
      setBuyerAgentName(json.data.buyerAgentName?.trim() ?? "");
      setBuyerAgentEmail(json.data.buyerAgentEmail?.trim() ?? "");
      setNotes(json.data.notes ?? "");
    }
  }, []);

  const handleArchiveShowing = useCallback(async () => {
    if (!id) return;
    setLifecycleBusy("archive");
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not archive showing");
      router.push("/showing-hq/showings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setLifecycleBusy(null);
      setLifecycleModalOpen(false);
    }
  }, [id, router]);

  const handleDeleteShowingForce = useCallback(async () => {
    if (!id) return;
    setLifecycleBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${id}?force=1`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not delete showing");
      router.push("/showing-hq/showings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLifecycleBusy(null);
      setLifecycleModalOpen(false);
    }
  }, [id, router]);

  const requestDeleteShowing = useCallback(() => {
    if (!data) return;
    const n = data.usage?.feedbackRequests ?? 0;
    if (n > 0) {
      setLifecycleModalOpen(true);
      return;
    }
    if (
      !window.confirm(
        "Remove this showing from your active list? Feedback history stays on related records."
      )
    )
      return;
    setLifecycleBusy("delete");
    setError(null);
    fetch(`/api/v1/showing-hq/showings/${id}`, { method: "DELETE" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
        router.push("/showing-hq/showings");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Delete failed"))
      .finally(() => setLifecycleBusy(null));
  }, [data, id, router]);

  async function saveDetails() {
    if (!data || !dateStr || !timeStr) {
      setError("Date and time are required.");
      return;
    }
    const scheduledIso = combineLocalDateAndTimeToIso(dateStr, timeStr);
    if (!scheduledIso) {
      setError("Invalid date or time.");
      return;
    }
    setDetailsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledIso,
          notes: notes.trim() ? notes : null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData((prev) =>
        json.data
          ? { ...json.data, usage: json.data.usage ?? prev?.usage }
          : prev
      );
      flashDetailsSaved();
    } catch (e) {
      setError(afError(e, AF.couldntSave));
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
    const scheduledIso = combineLocalDateAndTimeToIso(dateStr, timeStr);
    if (!scheduledIso) {
      setError("Invalid date or time.");
      return;
    }

    setSendSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/showing-hq/showings/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledIso,
          buyerAgentName: buyerAgentName.trim(),
          buyerAgentEmail: buyerAgentEmail.trim(),
          notes: notes.trim() ? notes : null,
          feedbackRequestStatus: "SENT",
          prepChecklistFlags: mergePrepChecklistFlags(data.prepChecklistFlags, {}),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setData((prev) =>
        json.data
          ? { ...json.data, usage: json.data.usage ?? prev?.usage }
          : prev
      );
      setFieldErrors({});
    } catch (e) {
      setError(afError(e, AF.couldntSave));
    } finally {
      setSendSaving(false);
    }
  }

  if (loading && !data) return <PageLoading message="Loading showing…" />;
  if (!data && error) {
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

  const scheduledLabel = new Date(data.scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const buyerLine = data.buyerName?.trim()
    ? `Buyer: ${data.buyerName.trim()}`
    : "Buyer: —";

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
            <Link href="/showing-hq">
              <ArrowLeft className="h-4 w-4" />
              ShowingHQ
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">Private showing</h1>
            <p className="text-sm text-kp-on-surface-muted">{addressLine}</p>
            <p className="text-sm text-kp-on-surface-muted">
              {scheduledLabel} · {buyerLine}
            </p>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-muted">
              Workspace — Prep, Feedback, and Details share one flow; save from Details or feedback actions when needed.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <ShowingHqWorkflowTabStrip tab={tab} onTabChange={setTab} />

      {tab === "prep" && (
        <div className="space-y-6">
          <p className="text-xs text-kp-on-surface-muted">
            Checklist and buyer agent fields — same workspace as Feedback and Details.
          </p>
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
                <p className="text-xs text-kp-on-surface-muted">
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
              <p className="mt-2 text-xs text-kp-on-surface-muted">
                Finish prep above, then move to Feedback when your draft is ready.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-kp-outline/60 bg-kp-bg/20 p-4">
            <h2 className="text-sm font-semibold text-kp-on-surface">Activity</h2>
            <ul className="mt-2 space-y-2 text-xs text-kp-on-surface-muted">
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
              <p className="mt-1 text-[11px] text-kp-on-surface-muted">
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
            <p className="text-[11px] text-kp-on-surface-muted">Editable — saved with Mark as sent or from Prep.</p>
            <div className="space-y-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-muted" htmlFor="wf-ba-name">
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
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-muted" htmlFor="wf-ba-email">
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
                <label className="mb-1 block text-xs font-medium text-kp-on-surface-muted" htmlFor="wf-notes">
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
              <p className="mt-1 text-[11px] text-kp-on-surface-muted">
                Use Open mail or Copy body from the preview above, then confirm below.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className={cn(kpBtnPrimary, "h-9 border-transparent px-4 text-sm font-semibold")}
                  disabled={sendSaving}
                  onClick={() => void sendFeedbackRequest()}
                >
                  {sendSaving ? AF.updating : "Mark as sent"}
                </Button>
              </div>
            </section>
          ) : null}

          {data.feedbackRequestStatus === "SENT" || data.feedbackRequestStatus === "RECEIVED" ? (
            <p className="text-xs text-kp-on-surface-muted">
              Feedback request already marked as sent or received. Use Prep or Details for other edits.
            </p>
          ) : null}

          {!data.feedbackDraftGeneratedAt ? (
            <p className="text-xs text-kp-on-surface-muted">
              A draft is generated after the visit is logged — if you do not see a preview yet, check Supra inbox or add
              the showing manually.
            </p>
          ) : null}
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-4">
          <p className="text-xs text-kp-on-surface-muted">
            Schedule and notes — use Save when you&apos;re done editing this tab.
          </p>
          <div className="space-y-3 rounded-lg border border-kp-outline/80 bg-kp-surface-high/25 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-muted">Schedule</p>
            <DateTimeFieldGroup className="max-w-md">
              <div className="space-y-1">
                <label htmlFor="showing-detail-date" className="block text-xs font-medium text-kp-on-surface-muted">
                  Date
                </label>
                <DateInputField
                  id="showing-detail-date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="showing-detail-time" className="block text-xs font-medium text-kp-on-surface-muted">
                  Time
                </label>
                <TimeInputField
                  id="showing-detail-time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
                />
              </div>
            </DateTimeFieldGroup>
            <TimeQuickChips
              onSelect={(p) => {
                const next = applyQuickTimePreset(p, { date: dateStr, time: timeStr });
                setDateStr(next.date);
                setTimeStr(next.time);
              }}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-kp-on-surface-muted">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full max-w-xl rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface"
              />
            </div>
          </div>

          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="mb-3 text-sm font-semibold text-kp-on-surface">Showing lifecycle</h2>
            <p className="mb-4 text-[12px] leading-relaxed text-kp-on-surface-muted">
              Archive hides this appointment from lists. Delete is only needed when you want it gone from the
              active vault and accept losing the default feedback-request linkage (archive is safer).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-9 border-transparent px-4 text-[12px] font-semibold")}
                disabled={lifecycleBusy !== null}
                onClick={() => void handleArchiveShowing()}
              >
                {lifecycleBusy === "archive" ? "Archiving…" : "Archive showing"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(kpBtnDangerSecondary, "h-9 px-4 text-[12px] font-semibold")}
                disabled={lifecycleBusy !== null}
                onClick={requestDeleteShowing}
              >
                {lifecycleBusy === "delete" && !lifecycleModalOpen ? "Deleting…" : "Delete showing"}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-kp-outline/70 bg-kp-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            )}
          >
            <InlineSuccessText show={detailsSavedVisible}>{AF.showingDetailsSaved}</InlineSuccessText>
            <Button
              type="button"
              variant="outline"
              className={cn(kpBtnSecondary, "h-9 text-sm")}
              disabled={detailsSaving}
              onClick={() => void saveDetails()}
            >
              {detailsSaving ? AF.saving : "Save changes"}
            </Button>
          </div>
        </div>
      )}

      <BrandModal
        open={lifecycleModalOpen}
        onOpenChange={setLifecycleModalOpen}
        title="Showing has feedback data"
        description="This showing has one or more feedback-request rows. Prefer archive unless you are cleaning up test data."
        size="md"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-9 text-[12px]")}
              disabled={lifecycleBusy !== null}
              onClick={() => setLifecycleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnPrimary, "h-9 border-transparent text-[12px]")}
              disabled={lifecycleBusy !== null}
              onClick={() => void handleArchiveShowing()}
            >
              {lifecycleBusy === "archive" ? "Archiving…" : "Archive instead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnDangerSecondary, "h-9 text-[12px]")}
              disabled={lifecycleBusy !== null}
              onClick={() => void handleDeleteShowingForce()}
            >
              {lifecycleBusy === "delete" ? "Deleting…" : "Delete anyway"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-[12px] text-kp-on-surface">
          <p className="font-medium text-kp-on-surface">Linked records:</p>
          <ul className="list-inside list-disc text-kp-on-surface-muted">
            <li>
              {data?.usage?.feedbackRequests ?? 0} feedback request
              {(data?.usage?.feedbackRequests ?? 0) === 1 ? "" : "s"} (
              {data?.usage?.feedbackRequestsPending ?? 0} pending)
            </li>
          </ul>
        </div>
      </BrandModal>
    </div>
  );
}
