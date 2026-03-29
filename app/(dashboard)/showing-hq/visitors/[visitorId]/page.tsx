"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";
import {
  Mail,
  Phone,
  User,
  Calendar,
  FileText,
  Copy,
  ExternalLink,
  Send,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

const LEAD_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "INTERESTED", label: "Interested" },
  { value: "HOT_BUYER", label: "Hot Buyer" },
  { value: "SELLER_LEAD", label: "Seller Lead" },
  { value: "NEIGHBOR", label: "Neighbor" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

type VisitorProfile = {
  visitor: {
    id: string;
    leadStatus: string | null;
    submittedAt: string;
    interestLevel?: string | null;
    visitorNotes?: string | null;
    visitorTags?: unknown;
    flyerEmailSentAt?: string | null;
    flyerEmailStatus?: string | null;
    flyerLinkClickedAt?: string | null;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      status: string | null;
      notes: string | null;
    };
    openHouse: { id: string; title: string; startAt: string; property?: { address1: string } };
  };
  allVisits: {
    id: string;
    submittedAt: string;
    openHouse: { id: string; title: string; startAt: string; property: { address1: string; city?: string; state?: string } };
  }[];
  followUpDrafts: {
    id: string;
    subject: string;
    body: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    openHouse: { id: string; title: string; property?: { address1: string } };
  }[];
};

export default function VisitorProfilePage() {
  const params = useParams();
  const visitorId = params.visitorId as string;
  const [data, setData] = useState<VisitorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [leadStatusSaving, setLeadStatusSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [resendFlyerLoading, setResendFlyerLoading] = useState(false);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/showing-hq/visitors/${visitorId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          setData(json.data);
          setNotes(json.data?.visitor?.contact?.notes ?? "");
        }
      })
      .catch(() => setError("Failed to load visitor"))
      .finally(() => setLoading(false));
  }, [visitorId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageLoading message="Loading visitor..." />;
  if (error || !data)
    return (
      <ErrorMessage
        message={error ?? "Visitor not found"}
        onRetry={() => window.location.reload()}
      />
    );

  const { visitor, allVisits, followUpDrafts } = data;
  const contact = visitor.contact;
  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unknown";

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatTimeShort = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // Build timeline events (chronological) from visitor + drafts
  type TimelineEvent = { at: string; label: string; detail?: string | null };
  const timelineEvents: TimelineEvent[] = [];
  timelineEvents.push({ at: visitor.submittedAt, label: "Signed in" });
  if (visitor.flyerEmailSentAt)
    timelineEvents.push({ at: visitor.flyerEmailSentAt, label: "Flyer sent" });
  if (visitor.flyerLinkClickedAt)
    timelineEvents.push({ at: visitor.flyerLinkClickedAt, label: "Flyer opened" });
  for (const d of followUpDrafts) {
    timelineEvents.push({ at: d.createdAt, label: "Follow-up draft created", detail: d.subject });
    if (d.status === "REVIEWED")
      timelineEvents.push({ at: d.updatedAt, label: "Follow-up marked reviewed", detail: d.subject });
    if (d.status === "SENT_MANUAL")
      timelineEvents.push({ at: d.updatedAt, label: "Follow-up sent", detail: d.subject });
    if (d.status === "ARCHIVED")
      timelineEvents.push({ at: d.updatedAt, label: "Follow-up dismissed", detail: d.subject });
  }
  timelineEvents.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const hasDraftReady = followUpDrafts.some((d) => d.status === "DRAFT");
  const hasReviewed = followUpDrafts.some((d) => d.status === "REVIEWED");
  const hasFollowUpSent = followUpDrafts.some((d) => d.status === "SENT_MANUAL");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
            asChild
          >
            <Link href="/showing-hq/visitors">
              <ArrowLeft className="h-4 w-4" />
              Visitors
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">{fullName}</h1>
            <p className="text-sm text-kp-on-surface-variant">
              <Link
                href={`/showing-hq/open-houses/${visitor.openHouse.id}`}
                className="text-kp-teal hover:underline"
              >
                {visitor.openHouse.title}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {contact.email && (
            <Button
              size="sm"
              variant="outline"
              className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
              disabled={resendFlyerLoading}
              onClick={async () => {
                setResendFlyerLoading(true);
                try {
                  const res = await fetch(`/api/v1/showing-hq/visitors/${visitorId}/resend-flyer`, {
                    method: "POST",
                  });
                  const json = await res.json();
                  if (json.error) throw new Error(json.error.message);
                  loadData();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to resend flyer");
                } finally {
                  setResendFlyerLoading(false);
                }
              }}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {resendFlyerLoading ? "Sending…" : "Resend flyer"}
            </Button>
          )}
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-8 text-xs")} asChild>
            <Link href={`/contacts/${contact.id}`}>View contact</Link>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Conversion status strip */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-kp-outline bg-kp-surface px-4 py-2.5">
        <span className="text-xs font-medium text-kp-on-surface-variant">Status</span>
        <span className="text-kp-outline">·</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          Signed in
        </span>
        {visitor.flyerEmailSentAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-kp-teal/15 px-2 py-0.5 text-xs font-medium text-kp-teal">
            <CheckCircle className="h-3 w-3" />
            Flyer sent
          </span>
        )}
        {visitor.flyerLinkClickedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-kp-teal/15 px-2 py-0.5 text-xs font-medium text-kp-teal">
            <CheckCircle className="h-3 w-3" />
            Flyer opened
          </span>
        )}
        {hasDraftReady && (
          <span className="rounded-full bg-kp-gold/15 px-2 py-0.5 text-xs font-medium text-kp-gold">
            Draft ready
          </span>
        )}
        {hasReviewed && (
          <span className="rounded-full bg-kp-on-surface-variant/15 px-2 py-0.5 text-xs font-medium text-kp-on-surface-variant">
            Reviewed
          </span>
        )}
        {hasFollowUpSent && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            Follow-up sent
          </span>
        )}
      </div>

      {/* Info + All visits */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Visitor info */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Visitor info</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">Contact details and status</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 shrink-0 text-kp-on-surface-variant" />
              <div className="flex-1">
                <p className="font-medium text-kp-on-surface">{fullName}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={visitor.leadStatus ?? "NEW"}
                    onValueChange={async (val) => {
                      setLeadStatusSaving(true);
                      try {
                        const res = await fetch(`/api/v1/showing-hq/visitors/${visitorId}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leadStatus: val }),
                        });
                        const json = await res.json();
                        if (json.error) throw new Error(json.error.message);
                        if (json.data?.visitor) setData((d) => d ? { ...d, visitor: json.data.visitor } : d);
                      } finally {
                        setLeadStatusSaving(false);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[140px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-kp-outline bg-kp-surface">
                      {LEAD_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-kp-on-surface">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leadStatusSaving && (
                    <span className="text-xs text-kp-on-surface-variant">Saving...</span>
                  )}
                </div>
              </div>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-kp-on-surface-variant" />
                <a href={`mailto:${contact.email}`} className="text-kp-teal hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {(visitor.flyerEmailSentAt || visitor.flyerEmailStatus === "FAILED" || visitor.flyerEmailStatus === "UNAVAILABLE") && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-kp-on-surface-variant" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {visitor.flyerEmailStatus === "SENT" && visitor.flyerLinkClickedAt && (
                    <span className="text-kp-on-surface-variant">Flyer sent ✓ · Flyer opened ✓</span>
                  )}
                  {visitor.flyerEmailStatus === "SENT" && !visitor.flyerLinkClickedAt && (
                    <span className="text-kp-on-surface-variant">Flyer sent ✓</span>
                  )}
                  {visitor.flyerEmailStatus === "FAILED" && (
                    <span className="text-amber-400">Flyer not delivered</span>
                  )}
                  {visitor.flyerEmailStatus === "UNAVAILABLE" && (
                    <span className="text-kp-on-surface-variant">Flyer unavailable</span>
                  )}
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-kp-on-surface-variant" />
                <a href={`tel:${contact.phone}`} className="text-kp-teal hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {(visitor.interestLevel || visitor.visitorNotes) && (
              <div className="mt-2 space-y-1 border-t border-kp-outline pt-3">
                {visitor.interestLevel && (
                  <p className="text-xs text-kp-on-surface-variant">
                    Interest:{" "}
                    <span className="font-medium text-kp-on-surface">
                      {visitor.interestLevel.replace(/_/g, " ")}
                    </span>
                  </p>
                )}
                {visitor.visitorNotes && (
                  <p className="text-xs text-kp-on-surface-variant">Notes: {visitor.visitorNotes}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Open houses attended */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Open houses attended</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">
            {allVisits.length} visit{allVisits.length !== 1 ? "s" : ""}
          </p>
          {allVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-kp-on-surface">No visits recorded</p>
              <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
                Visits will appear when this contact signs in at future open houses.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {allVisits.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-kp-outline bg-kp-surface-high p-3"
                >
                  <div>
                    <p className="font-medium text-kp-on-surface">{v.openHouse.title}</p>
                    <p className="text-sm text-kp-on-surface-variant">{formatDateTime(v.submittedAt)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(kpBtnSecondary, "h-7 text-xs")}
                    asChild
                  >
                    <Link href={`/showing-hq/open-houses/${v.openHouse.id}`}>Open workspace</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="mb-1 text-sm font-semibold text-kp-on-surface">Visitor timeline</p>
        <p className="mb-4 text-xs text-kp-on-surface-variant">Activity and conversion steps</p>
        {timelineEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-kp-on-surface">No activity yet</p>
            <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
              Timeline will show sign-in, flyer, and follow-up events.
            </p>
          </div>
        ) : (
          <ul className="space-y-0">
            {timelineEvents.map((evt, i) => (
              <li
                key={`${evt.at}-${evt.label}-${i}`}
                className="flex items-baseline gap-3 border-b border-kp-outline py-2.5 last:border-b-0"
              >
                <span className="shrink-0 w-32 text-xs text-kp-on-surface-variant tabular-nums">
                  {formatTimeShort(evt.at)}
                </span>
                <span className="font-medium text-kp-on-surface">{evt.label}</span>
                {evt.detail && (
                  <span className="truncate text-sm text-kp-on-surface-variant">{evt.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Follow-up drafts + Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Follow-up drafts */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Follow-up drafts</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">Drafts tied to this visitor</p>
          {followUpDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-kp-on-surface">No follow-up drafts yet</p>
              <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
                A draft is created automatically when this visitor signs in. If they signed in before this feature, generate from the open house follow-ups page.
              </p>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "mt-3 h-7 text-xs")}
                asChild
              >
                <Link href="/showing-hq/follow-ups/drafts">View email drafts</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {followUpDrafts.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-kp-outline bg-kp-surface-high p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-kp-on-surface">{d.subject}</p>
                    <p className="text-sm text-kp-on-surface-variant">
                      {d.openHouse.title}
                      {d.openHouse.property?.address1 && ` · ${d.openHouse.property.address1}`}
                    </p>
                    <div className="mt-2">
                      <FollowUpStatusBadge status={d.status} className="text-xs" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(kpBtnSecondary, "h-7 text-xs")}
                      asChild
                    >
                      <Link href={`/showing-hq/follow-ups/draft/${d.id}`}>Review draft</Link>
                    </Button>
                    {d.status === "DRAFT" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(kpBtnTertiary, "h-7 text-xs")}
                        disabled={statusSavingId === d.id}
                        onClick={async () => {
                          setStatusSavingId(d.id);
                          try {
                            const res = await fetch(`/api/v1/follow-up-drafts/${d.id}/status`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ status: "REVIEWED" }),
                            });
                            const json = await res.json();
                            if (json.error) throw new Error(json.error.message);
                            loadData();
                          } finally {
                            setStatusSavingId(null);
                          }
                        }}
                      >
                        {statusSavingId === d.id ? "Saving…" : "Mark reviewed"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(kpBtnTertiary, "h-7 text-xs")}
                      onClick={async () => {
                        const text = `Subject: ${d.subject}\n\n${d.body}`;
                        await navigator.clipboard.writeText(text);
                        setCopyFeedback(d.id);
                        setTimeout(() => setCopyFeedback(null), 2000);
                      }}
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      {copyFeedback === d.id ? "Copied" : "Copy email text"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(kpBtnTertiary, "h-7 text-xs")}
                      asChild
                    >
                      <Link href={`/showing-hq/open-houses/${d.openHouse.id}`}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Open workspace
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Notes</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">Contact notes</p>
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this visitor..."
              className="min-h-[100px] resize-y border-kp-outline bg-kp-surface-high text-kp-on-surface placeholder:text-kp-on-surface-variant focus-visible:ring-kp-teal/30"
            />
            <Button
              size="sm"
              variant="outline"
              className={cn(kpBtnPrimary, "h-8 border-transparent px-4 text-xs")}
              disabled={notesSaving}
              onClick={async () => {
                setNotesSaving(true);
                try {
                  const res = await fetch(`/api/v1/contacts/${contact.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: notes || null }),
                  });
                  const json = await res.json();
                  if (json.error) throw new Error(json.error.message);
                  if (json.data) setData((d) => d ? { ...d, visitor: { ...d.visitor, contact: json.data } } : d);
                } finally {
                  setNotesSaving(false);
                }
              }}
            >
              {notesSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
