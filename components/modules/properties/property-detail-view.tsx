"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PropertyFeedbackSummaryView } from "./property-feedback-summary";
import { PropertySellerReportView } from "./property-seller-report";
import {
  ArrowLeft,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Calendar,
  DollarSign,
  Pencil,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Property = {
  id: string;
  mlsNumber?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  listingPrice?: string | number | null;
  notes?: string | null;
  flyerUrl?: string | null;
  flyerFilename?: string | null;
  flyerUploadedAt?: string | null;
  flyerEnabled?: boolean;
  openHouses?: { id: string; title: string; startAt: string }[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(p: string | number | null | undefined) {
  if (p == null) return "—";
  const n = typeof p === "string" ? parseFloat(p) : p;
  return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-28 shrink-0 text-xs font-medium text-kp-on-surface-variant">{label}</span>
      <span className="text-sm text-kp-on-surface">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type EditForm = {
  mlsNumber: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  listingPrice: string;
  notes: string;
};

export function PropertyDetailView({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    mlsNumber: "", address1: "", address2: "", city: "", state: "", zip: "", listingPrice: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function startEditing(p: Property) {
    setEditForm({
      mlsNumber: p.mlsNumber ?? "",
      address1: p.address1,
      address2: p.address2 ?? "",
      city: p.city,
      state: p.state,
      zip: p.zip,
      listingPrice: p.listingPrice != null ? String(p.listingPrice) : "",
      notes: p.notes ?? "",
    });
    setSaveError(null);
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!property) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/v1/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlsNumber: editForm.mlsNumber || null,
          address1: editForm.address1,
          address2: editForm.address2 || null,
          city: editForm.city,
          state: editForm.state,
          zip: editForm.zip,
          listingPrice: editForm.listingPrice ? parseFloat(editForm.listingPrice) : null,
          notes: editForm.notes || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setProperty((p) => p ? { ...p, ...json.data } : p);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/properties/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperty(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFlyerUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setFlyerError(null);
      setFlyerUploading(true);
      const formData = new FormData();
      formData.set("file", file);
      fetch(`/api/v1/properties/${id}/flyer`, { method: "POST", body: formData })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          setProperty((p) =>
            p
              ? {
                  ...p,
                  flyerUrl: json.data.flyerUrl,
                  flyerFilename: json.data.flyerFilename,
                  flyerUploadedAt: json.data.flyerUploadedAt,
                  flyerEnabled: true,
                }
              : p
          );
        })
        .catch((err) => setFlyerError(err instanceof Error ? err.message : "Upload failed"))
        .finally(() => setFlyerUploading(false));
    },
    [id]
  );

  const handleRemoveFlyer = useCallback(() => {
    if (!confirm("Remove this flyer? It will no longer be sent to visitors.")) return;
    setFlyerError(null);
    setFlyerUploading(true);
    fetch(`/api/v1/properties/${id}/flyer`, { method: "DELETE" })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setProperty((p) =>
          p
            ? {
                ...p,
                flyerUrl: null,
                flyerFilename: null,
                flyerUploadedAt: null,
                flyerEnabled: true,
              }
            : p
        );
      })
      .catch((err) => setFlyerError(err instanceof Error ? err.message : "Remove failed"))
      .finally(() => setFlyerUploading(false));
  }, [id]);

  if (loading) return <PageLoading message="Loading property…" />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const hasFlyer = !!(property.flyerUrl?.trim() && property.flyerEnabled !== false);
  const fullAddress = [property.address1, property.address2].filter(Boolean).join(" ");
  const locationLine = [property.city, property.state, property.zip].filter(Boolean).join(", ");
  const fullAddressForReport = [property.address1, property.city, property.state, property.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
          asChild
        >
          <Link href="/properties">
            <ArrowLeft className="h-4 w-4" />
            Properties
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-kp-on-surface">{fullAddress}</h1>
          <p className="mt-0.5 text-sm text-kp-on-surface-variant">{locationLine}</p>
        </div>
        {property.listingPrice && !isEditing && (
          <span className="flex items-center gap-1 rounded-lg border border-kp-gold/40 bg-kp-gold/10 px-3 py-1 text-sm font-semibold text-kp-gold">
            <DollarSign className="h-3.5 w-3.5" />
            {formatPrice(property.listingPrice)}
          </span>
        )}
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
            onClick={() => startEditing(property)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {/* ── Two-column layout: details left, reports right ──────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* ── LEFT: Property info + Flyer + Open houses ───────────────────────── */}
        <div className="space-y-5">

          {/* Property details */}
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="mb-4 text-sm font-semibold text-kp-on-surface">Property details</h2>

            {isEditing ? (
              <div className="space-y-3">
                {saveError && <p className="text-sm text-red-400">{saveError}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Address</label>
                    <input
                      className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      value={editForm.address1}
                      onChange={(e) => setEditForm((f) => ({ ...f, address1: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Address 2</label>
                    <input
                      className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      value={editForm.address2}
                      onChange={(e) => setEditForm((f) => ({ ...f, address2: e.target.value }))}
                      placeholder="Unit, apt, etc."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">City</label>
                    <input
                      className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">State</label>
                      <input
                        className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                        value={editForm.state}
                        onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                        maxLength={2}
                        placeholder="CA"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">ZIP</label>
                      <input
                        className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                        value={editForm.zip}
                        onChange={(e) => setEditForm((f) => ({ ...f, zip: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">MLS #</label>
                    <input
                      className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      value={editForm.mlsNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, mlsNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Listing price</label>
                    <input
                      type="number"
                      className="h-8 w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                      value={editForm.listingPrice}
                      onChange={(e) => setEditForm((f) => ({ ...f, listingPrice: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-kp-on-surface-variant">Notes</label>
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="rounded-lg bg-kp-gold px-4 py-1.5 text-sm font-semibold text-kp-bg transition-colors hover:bg-kp-gold-bright disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                    className="rounded-lg border border-kp-outline px-4 py-1.5 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {property.mlsNumber && (
                  <InfoRow label="MLS #" value={property.mlsNumber} />
                )}
                <InfoRow label="Listing price" value={formatPrice(property.listingPrice)} />
                <InfoRow label="City" value={property.city} />
                <InfoRow label="State" value={`${property.state} ${property.zip}`} />
                {property.notes && (
                  <InfoRow label="Notes" value={property.notes} />
                )}
              </div>
            )}
          </div>

          {/* Flyer */}
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-kp-on-surface-variant" />
              <h2 className="text-sm font-semibold text-kp-on-surface">Property flyer</h2>
            </div>
            <p className="mb-4 text-xs text-kp-on-surface-variant">
              PDF flyer sent to visitors after open house sign-in. Created in Canva or elsewhere.
            </p>

            {flyerError && (
              <p className="mb-3 text-sm text-red-400">{flyerError}</p>
            )}

            {/* Hidden file input — always present */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFlyerUpload}
            />

            {hasFlyer ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
                  <span className="font-medium text-kp-on-surface">
                    {property.flyerFilename ?? "Flyer"}
                  </span>
                  {property.flyerUploadedAt && (
                    <span className="text-xs text-kp-on-surface-variant">
                      · {formatDate(property.flyerUploadedAt)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high" asChild>
                    <a href={property.flyerUrl!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                    disabled={flyerUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    {flyerUploading ? "Uploading…" : "Replace"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
                    disabled={flyerUploading}
                    onClick={handleRemoveFlyer}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                disabled={flyerUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {flyerUploading ? "Uploading…" : "Upload flyer (PDF)"}
              </Button>
            )}
          </div>

          {/* Open houses */}
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-kp-on-surface-variant" />
              <h2 className="text-sm font-semibold text-kp-on-surface">Open houses</h2>
            </div>
            <p className="mb-4 text-xs text-kp-on-surface-variant">Events at this property</p>

            {!property.openHouses?.length ? (
              <p className="mb-4 text-sm text-kp-on-surface-variant">No open houses yet.</p>
            ) : (
              <ul className="mb-4 divide-y divide-kp-outline">
                {property.openHouses.map((oh) => (
                  <li key={oh.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-kp-on-surface">{oh.title}</p>
                      <p className="text-xs text-kp-on-surface-variant">{formatDate(oh.startAt)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
                      asChild
                    >
                      <Link href={`/open-houses/${oh.id}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              size="sm"
              className="h-8 border-0 bg-kp-teal px-3 text-xs text-kp-bg hover:opacity-90"
              asChild
            >
              <Link href="/open-houses/new">New open house</Link>
            </Button>
          </div>
        </div>

        {/* ── RIGHT: Feedback summary + Seller report ──────────────────────────── */}
        <div className="space-y-5">
          <PropertyFeedbackSummaryView propertyId={id} />
          <PropertySellerReportView propertyId={id} propertyAddress={fullAddressForReport} />
        </div>
      </div>
    </div>
  );
}
