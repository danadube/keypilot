"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  Trash2,
  ExternalLink,
  StickyNote,
  Handshake,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  STATUS_LABELS as TX_STATUS_LABELS,
  statusBadgeVariant as txStatusBadgeVariant,
  type TxStatus,
} from "@/components/modules/transactions/transactions-shared";
import { UI_COPY } from "@/lib/ui-copy";

// ── Types ─────────────────────────────────────────────────────────────────────

type DealStatus =
  | "INTERESTED"
  | "SHOWING"
  | "OFFER"
  | "NEGOTIATION"
  | "UNDER_CONTRACT"
  | "CLOSED"
  | "LOST";

type Deal = {
  id: string;
  status: DealStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    status: string | null;
  };
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  linkedTransaction: {
    id: string;
    status: TxStatus;
    salePrice: string | number | null;
  } | null;
};

// ── Config ────────────────────────────────────────────────────────────────────

const DEAL_STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: "INTERESTED",     label: "Interested"     },
  { value: "SHOWING",        label: "Showing"        },
  { value: "OFFER",          label: "Offer"          },
  { value: "NEGOTIATION",    label: "Negotiation"    },
  { value: "UNDER_CONTRACT", label: "Under Contract" },
  { value: "CLOSED",         label: "Closed"         },
  { value: "LOST",           label: "Lost"           },
];

const STATUS_LABELS: Record<DealStatus, string> = {
  INTERESTED:     "Interested",
  SHOWING:        "Showing",
  OFFER:          "Offer",
  NEGOTIATION:    "Negotiating",
  UNDER_CONTRACT: "Under Contract",
  CLOSED:         "Closed",
  LOST:           "Lost",
};

function statusBadgeVariant(
  s: DealStatus
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "INTERESTED":     return "pending";
    case "SHOWING":        return "upcoming";
    case "OFFER":          return "active";
    case "NEGOTIATION":    return "live";
    case "UNDER_CONTRACT": return "sold";
    case "CLOSED":         return "closed";
    case "LOST":           return "cancelled";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTxSalePrice(v: string | number | null | undefined) {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-kp-on-surface-variant" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-kp-on-surface-muted">{label}</p>
        <div className="mt-0.5 text-sm text-kp-on-surface">{children}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * DealDetailView — dark premium detail surface for a single deal.
 *
 * API: GET/PATCH/DELETE /api/v1/deals/[id]
 * Route: app/(dashboard)/deals/[id]/page.tsx
 */
export function DealDetailView({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state — mirrors server state until saved
  const [status, setStatus] = useState<DealStatus>("INTERESTED");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDeal = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/deals/${dealId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message ?? UI_COPY.errors.load("deal"));
        } else {
          const raw = json.data;
          const d: Deal = {
            ...raw,
            linkedTransaction: raw.linkedTransaction ?? null,
          };
          setDeal(d);
          setStatus(d.status);
          setNotes(d.notes ?? "");
          setDirty(false);
        }
      })
      .catch(() => setError(UI_COPY.errors.load("deal")))
      .finally(() => setLoading(false));
  }, [dealId]);

  useEffect(() => {
    loadDeal();
  }, [loadDeal]);

  const handleSave = async () => {
    if (!deal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes: notes || null }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const raw = json.data;
      const d: Deal = { ...raw, linkedTransaction: raw.linkedTransaction ?? null };
      setDeal(d);
      setStatus(d.status);
      setNotes(d.notes ?? "");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/deals/${dealId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      router.push("/deals");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-full rounded-2xl bg-kp-bg">
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-kp-on-surface-variant" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-full rounded-2xl bg-kp-bg">
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-kp-on-surface-variant">{error ?? "Deal not found"}</p>
          <button
            onClick={loadDeal}
            className="text-sm font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            {UI_COPY.errors.retry}
          </button>
        </div>
      </div>
    );
  }

  const contactName = [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" ") || "Unknown";
  const address = [deal.property.address1, deal.property.city, `${deal.property.state} ${deal.property.zip}`]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="min-h-full rounded-2xl bg-kp-bg">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="px-6 pb-5 pt-6 sm:px-8">
        {/* Back link */}
        <Link
          href="/deals"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-kp-on-surface-variant transition-colors hover:text-kp-on-surface"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Deals
        </Link>

        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-[1.75rem] font-semibold leading-tight tracking-tight text-kp-on-surface">
                {contactName}
              </h1>
              <StatusBadge variant={statusBadgeVariant(deal.status)}>
                {STATUS_LABELS[deal.status]}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-kp-on-surface-variant">{address}</p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid gap-4 px-6 pb-4 sm:px-8 lg:grid-cols-[1fr_360px]">

        {/* ── Left column — contact + property ────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Contact card */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-kp-on-surface">Contact</p>
                  <p className="text-xs text-kp-on-surface-variant">Buyer linked to this deal</p>
                </div>
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                >
                  Open contact
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <InfoRow icon={User} label="Name">
                <span className="font-medium">{contactName}</span>
              </InfoRow>
              {deal.contact.email ? (
                <InfoRow icon={Mail} label="Email">
                  <a
                    href={`mailto:${deal.contact.email}`}
                    className="text-kp-teal hover:underline"
                  >
                    {deal.contact.email}
                  </a>
                </InfoRow>
              ) : (
                <InfoRow icon={Mail} label="Email">
                  <span className="text-kp-on-surface-variant">—</span>
                </InfoRow>
              )}
              {deal.contact.phone ? (
                <InfoRow icon={Phone} label="Phone">
                  <a
                    href={`tel:${deal.contact.phone}`}
                    className="text-kp-teal hover:underline"
                  >
                    {deal.contact.phone}
                  </a>
                </InfoRow>
              ) : (
                <InfoRow icon={Phone} label="Phone">
                  <span className="text-kp-on-surface-variant">—</span>
                </InfoRow>
              )}
            </div>
          </div>

          {/* Property card */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-kp-on-surface">Property</p>
                  <p className="text-xs text-kp-on-surface-variant">Property linked to this deal</p>
                </div>
                <Link
                  href={`/properties/${deal.property.id}`}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-kp-teal transition-colors hover:bg-kp-teal/10"
                >
                  Open property
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              </div>
            </div>
            <div className="space-y-4 px-5 py-4">
              <InfoRow icon={MapPin} label="Address">
                <p>{deal.property.address1}</p>
                <p className="text-kp-on-surface-variant">
                  {deal.property.city}, {deal.property.state} {deal.property.zip}
                </p>
              </InfoRow>
            </div>
          </div>

          {/* Linked closing record (read-only) */}
          {deal.linkedTransaction ? (
            <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
              <div className="border-b border-kp-outline px-5 py-4">
                <div className="flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-kp-on-surface-variant" />
                  <div>
                    <p className="text-sm font-semibold text-kp-on-surface">Linked transaction</p>
                    <p className="text-xs text-kp-on-surface-variant">
                      Closing record linked from this deal
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant={txStatusBadgeVariant(deal.linkedTransaction.status)}>
                    {TX_STATUS_LABELS[deal.linkedTransaction.status]}
                  </StatusBadge>
                </div>
                <InfoRow icon={DollarSign} label="Sale price">
                  {formatTxSalePrice(deal.linkedTransaction.salePrice)}
                </InfoRow>
                <Link
                  href={`/transactions/${deal.linkedTransaction.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-kp-teal hover:underline"
                >
                  Open transaction
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </Link>
              </div>
            </div>
          ) : null}

          {/* Timeline card */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <p className="text-sm font-semibold text-kp-on-surface">Timeline</p>
              <p className="text-xs text-kp-on-surface-variant">Deal history</p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <InfoRow icon={Calendar} label="Created">
                {formatDate(deal.createdAt)}
              </InfoRow>
              <InfoRow icon={Calendar} label="Last updated">
                {formatDateTime(deal.updatedAt)}
              </InfoRow>
            </div>
          </div>
        </div>

        {/* ── Right column — stage + notes ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Stage panel */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <p className="text-sm font-semibold text-kp-on-surface">Stage</p>
              <p className="text-xs text-kp-on-surface-variant">Current pipeline stage</p>
            </div>
            <div className="px-5 py-4">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as DealStatus);
                    setDirty(true);
                  }}
                  className={cn(
                    "w-full appearance-none rounded-lg border border-kp-outline bg-kp-surface-high",
                    "px-3 py-2.5 text-sm text-kp-on-surface",
                    "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                  )}
                >
                  {DEAL_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-kp-surface text-kp-on-surface">
                      {o.label}
                    </option>
                  ))}
                </select>
                {/* Chevron */}
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-kp-on-surface-variant">
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>

              {/* Stage description */}
              <p className="mt-2 text-xs text-kp-on-surface-variant">
                {status === "INTERESTED"     && "Initial interest — buyer has expressed interest."}
                {status === "SHOWING"        && "Active showings — property viewings in progress."}
                {status === "OFFER"          && "Offer submitted — awaiting seller response."}
                {status === "NEGOTIATION"    && "In negotiation — terms being finalized."}
                {status === "UNDER_CONTRACT" && "Under contract — accepted offer, closing pending."}
                {status === "CLOSED"         && "Closed — deal successfully completed."}
                {status === "LOST"           && "Lost — buyer went elsewhere or deal fell through."}
              </p>
            </div>
          </div>

          {/* Notes panel */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-kp-on-surface-variant" />
                <p className="text-sm font-semibold text-kp-on-surface">Notes</p>
              </div>
              <p className="mt-0.5 text-xs text-kp-on-surface-variant">Internal notes for this deal</p>
            </div>
            <div className="px-5 py-4">
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setDirty(true);
                }}
                placeholder="Add deal notes…"
                rows={6}
                className={cn(
                  "w-full resize-y rounded-lg border border-kp-outline bg-kp-surface-high",
                  "px-3 py-2.5 text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
                  "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                )}
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className={cn(
              "w-full rounded-lg py-2.5 text-sm font-semibold transition-colors",
              dirty && !saving
                ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
            )}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : dirty ? (
              "Save changes"
            ) : (
              "No changes"
            )}
          </button>

          {/* Delete panel */}
          <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
            <div className="border-b border-kp-outline px-5 py-4">
              <p className="text-sm font-semibold text-kp-on-surface">Danger zone</p>
              <p className="text-xs text-kp-on-surface-variant">Destructive actions</p>
            </div>
            <div className="px-5 py-4">
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete deal
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-kp-on-surface">
                    Delete this deal permanently?
                  </p>
                  <p className="text-xs text-kp-on-surface-variant">
                    This cannot be undone. The contact and property will not be affected.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                    >
                      {deleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deleting}
                      className="rounded-lg border border-kp-outline px-4 py-2 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
