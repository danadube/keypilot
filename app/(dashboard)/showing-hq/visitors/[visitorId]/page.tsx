"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Phone, User, Calendar, FileText, Copy, ExternalLink, Send } from "lucide-react";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { FollowUpStatusBadge } from "@/components/shared/FollowUpStatusBadge";

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

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title={fullName}
        description={visitor.openHouse.title}
        actions={
          <div className="flex flex-wrap gap-2">
            {contact.email && (
              <BrandButton
                variant="secondary"
                size="sm"
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
              </BrandButton>
            )}
            <BrandButton variant="secondary" asChild>
              <Link href={`/contacts/${contact.id}`}>View contact</Link>
            </BrandButton>
            <BrandButton variant="secondary" asChild>
              <Link href="/showing-hq/visitors">← All visitors</Link>
            </BrandButton>
          </div>
        }
      />

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Visitor info"
            description="Contact details and status"
          />
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-[var(--brand-text-muted)]" />
              <div className="flex-1">
                <p className="font-medium text-[var(--brand-text)]">{fullName}</p>
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
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {leadStatusSaving && <span className="text-xs text-[var(--brand-text-muted)]">Saving...</span>}
                </div>
              </div>
            </div>
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[var(--brand-text-muted)]" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-[var(--brand-primary)] hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}
            {(visitor.flyerEmailSentAt || visitor.flyerEmailStatus === "FAILED" || visitor.flyerEmailStatus === "UNAVAILABLE") && (
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-[var(--brand-text-muted)]" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {visitor.flyerEmailStatus === "SENT" && visitor.flyerLinkClickedAt && (
                    <span className="text-[var(--brand-text-muted)]">Flyer sent ✓ · Flyer opened ✓</span>
                  )}
                  {visitor.flyerEmailStatus === "SENT" && !visitor.flyerLinkClickedAt && (
                    <span className="text-[var(--brand-text-muted)]">Flyer sent ✓</span>
                  )}
                  {visitor.flyerEmailStatus === "FAILED" && (
                    <span className="text-amber-600 dark:text-amber-400">Flyer not delivered</span>
                  )}
                  {visitor.flyerEmailStatus === "UNAVAILABLE" && (
                    <span className="text-[var(--brand-text-muted)]">Flyer unavailable</span>
                  )}
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[var(--brand-text-muted)]" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-[var(--brand-primary)] hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}
            {(visitor.interestLevel || visitor.visitorNotes) && (
              <div className="mt-2 space-y-1 border-t border-[var(--brand-border)] pt-3">
                {visitor.interestLevel && (
                  <p className="text-xs text-[var(--brand-text-muted)]">
                    Interest: <span className="font-medium text-[var(--brand-text)]">{visitor.interestLevel.replace(/_/g, " ")}</span>
                  </p>
                )}
                {visitor.visitorNotes && (
                  <p className="text-xs text-[var(--brand-text-muted)]">Notes: {visitor.visitorNotes}</p>
                )}
              </div>
            )}
          </div>
        </BrandCard>

        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Open houses attended"
            description={`${allVisits.length} visit${allVisits.length !== 1 ? "s" : ""}`}
          />
          <div className="mt-4">
            {allVisits.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<Calendar className="h-6 w-6" />}
                title="No visits recorded"
                description="Visits will appear when this contact signs in at future open houses."
              />
            ) : (
              <ul className="space-y-3">
                {allVisits.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-3"
                  >
                    <div>
                      <p className="font-medium text-[var(--brand-text)]">
                        {v.openHouse.title}
                      </p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {formatDateTime(v.submittedAt)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/showing-hq/open-houses/${v.openHouse.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BrandCard>
      </div>

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Follow-up drafts"
            description="Drafts tied to this visitor"
          />
          <div className="mt-4">
            {followUpDrafts.length === 0 ? (
              <BrandEmptyState
                compact
                variant="premium"
                icon={<FileText className="h-6 w-6" />}
                title="No follow-up drafts yet"
                description="A draft is created automatically when this visitor signs in. If they signed in before this feature, generate from the open house follow-ups page."
                action={
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/showing-hq/follow-ups">View follow-ups</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {followUpDrafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--brand-border)] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--brand-text)]">
                        {d.subject}
                      </p>
                      <p className="text-sm text-[var(--brand-text-muted)]">
                        {d.openHouse.title}
                        {d.openHouse.property?.address1 && ` · ${d.openHouse.property.address1}`}
                      </p>
                      <div className="mt-2">
                        <FollowUpStatusBadge status={d.status} className="text-xs" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/showing-hq/follow-ups/draft/${d.id}`}>
                          Review draft
                        </Link>
                      </Button>
                      {d.status === "DRAFT" && (
                        <Button
                          variant="ghost"
                          size="sm"
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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/showing-hq/open-houses/${d.openHouse.id}`}>
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Open house
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </BrandCard>

        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Notes"
            description="Contact notes"
          />
          <div className="mt-4 space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this visitor..."
              className="min-h-[100px] resize-y"
            />
            <Button
              size="sm"
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
        </BrandCard>
      </div>
    </div>
  );
}
