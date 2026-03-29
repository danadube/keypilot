"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PropertyFeedbackSummaryView } from "./property-feedback-summary";
import { PropertySellerReportView } from "./property-seller-report";
import { PropertyVaultPropertySubnav } from "./property-vault-property-subnav";
import { PropertyFlyerPanel, type PropertyFlyerFields } from "./property-flyer-panel";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Calendar,
  DollarSign,
  Pencil,
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import {
  kpBtnDangerSecondary,
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnSave,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";

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
  flyerEnabled?: boolean | null;
  imageUrl?: string | null;
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  const patchFlyer = useCallback((patch: Partial<PropertyFlyerFields>) => {
    setProperty((p) => (p ? { ...p, ...patch } : p));
  }, []);

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setPhotoError(null);
      setPhotoUploading(true);
      const formData = new FormData();
      formData.set("file", file);
      fetch(`/api/v1/properties/${id}/photo`, { method: "POST", body: formData })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          setProperty((p) => (p ? { ...p, imageUrl: json.data.imageUrl } : p));
        })
        .catch((err) =>
          setPhotoError(err instanceof Error ? err.message : "Photo upload failed")
        )
        .finally(() => setPhotoUploading(false));
    },
    [id]
  );

  const handleRemovePhoto = useCallback(() => {
    if (
      !confirm(
        "Remove this key photo? It will no longer appear here or on visitor sign-in pages."
      )
    )
      return;
    setPhotoError(null);
    setPhotoUploading(true);
    fetch(`/api/v1/properties/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setProperty((p) => (p ? { ...p, imageUrl: null } : p));
      })
      .catch((err) =>
        setPhotoError(err instanceof Error ? err.message : "Could not remove photo")
      )
      .finally(() => setPhotoUploading(false));
  }, [id]);

  if (loading) return <PageLoading message="Loading property…" />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const hasHeroImage = !!property.imageUrl?.trim();
  const fullAddress = [property.address1, property.address2].filter(Boolean).join(" ");
  const locationLine = [property.city, property.state, property.zip].filter(Boolean).join(", ");
  const fullAddressForReport = [property.address1, property.city, property.state, property.zip]
    .filter(Boolean)
    .join(", ");

  const priceBadge = property.listingPrice ? (
    <span
      className={
        hasHeroImage
          ? "flex items-center gap-1 rounded-lg border border-white/30 bg-black/35 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm"
          : "flex items-center gap-1 rounded-lg border border-kp-gold/40 bg-kp-gold/10 px-3 py-1 text-sm font-semibold text-kp-gold"
      }
    >
      <DollarSign className="h-3.5 w-3.5" />
      {formatPrice(property.listingPrice)}
    </span>
  ) : null;

  const editButton =
    !isEditing ? (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          kpBtnSecondary,
          "h-8 text-xs",
          hasHeroImage &&
            "border-white/35 bg-black/35 text-white backdrop-blur-sm hover:border-white/50 hover:bg-black/50 hover:text-white"
        )}
        onClick={() => startEditing(property)}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        Edit
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* ── Back ───────────────────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
          asChild
        >
          <Link href="/properties">
            <ArrowLeft className="h-4 w-4" />
            Properties
          </Link>
        </Button>
      </div>

      <PropertyVaultPropertySubnav propertyId={id} current="overview" />

      {/* ── Hero + property header ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
        <div className="relative aspect-[2/1] max-h-[300px] min-h-[168px] w-full bg-kp-surface-high sm:max-h-[340px]">
          {hasHeroImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={property.imageUrl!}
              alt={`${fullAddress}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4">
              <p className="text-center text-sm text-kp-on-surface-variant">
                Add a key photo for this listing. It appears here and on open house sign-in.
              </p>
              {photoError && <p className="text-center text-sm text-red-400">{photoError}</p>}
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                disabled={photoUploading}
                onClick={() => photoInputRef.current?.click()}
              >
                <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                {photoUploading ? "Uploading…" : "Upload photo"}
              </Button>
            </div>
          )}

          {hasHeroImage && (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 sm:pt-28" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white drop-shadow-md sm:text-xl">
                    {fullAddress}
                  </h1>
                  <p className="mt-0.5 text-sm text-white/90 drop-shadow">{locationLine}</p>
                </div>
                <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                  {priceBadge}
                  {editButton}
                </div>
              </div>
              <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1.5">
                {photoError && (
                  <p className="w-full max-w-[240px] rounded-md bg-red-950/90 px-2 py-1 text-right text-xs text-red-200">
                    {photoError}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    kpBtnSecondary,
                    "h-8 border-0 bg-black/50 text-xs text-white backdrop-blur-sm hover:bg-black/65 hover:text-white"
                  )}
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {photoUploading ? "…" : "Replace"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    kpBtnDangerSecondary,
                    "h-8 border-0 bg-black/50 text-xs backdrop-blur-sm hover:text-red-100"
                  )}
                  disabled={photoUploading}
                  onClick={handleRemovePhoto}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </>
          )}
        </div>

        {!hasHeroImage && (
          <div className="flex flex-wrap items-start gap-3 border-t border-kp-outline p-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-kp-on-surface">{fullAddress}</h1>
              <p className="mt-0.5 text-sm text-kp-on-surface-variant">{locationLine}</p>
            </div>
            {priceBadge}
            {editButton}
          </div>
        )}
      </div>

      <p className="-mt-2 text-xs text-kp-on-surface-variant">
        <Link href={`/properties/${id}/media`} className="font-medium text-kp-teal hover:underline">
          Photos &amp; media page
        </Link>{" "}
        for a larger preview and the same upload controls.
      </p>

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
                  <Button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className={cn(kpBtnSave, "h-9 px-4")}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setIsEditing(false)}
                    className={cn(kpBtnSecondary, "h-9 px-4")}
                  >
                    Cancel
                  </Button>
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

          {/* Flyer — same panel as /properties/[id]/documents; subnav switches context */}
          <PropertyFlyerPanel
            propertyId={id}
            flyer={{
              flyerUrl: property.flyerUrl,
              flyerFilename: property.flyerFilename,
              flyerUploadedAt: property.flyerUploadedAt,
              flyerEnabled: property.flyerEnabled,
            }}
            onFlyerPatch={patchFlyer}
          />

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
                      className={cn(kpBtnTertiary, "h-7 text-xs")}
                      asChild
                    >
                      <Link href={showingHqOpenHouseWorkspaceHref(oh.id)}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
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
