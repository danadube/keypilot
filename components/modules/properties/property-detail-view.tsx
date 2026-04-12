"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BrandModal } from "@/components/ui/BrandModal";
import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useProductTier } from "@/components/ProductTierProvider";
import type { PropertyFlyerFields } from "./property-flyer-panel";
import { PropertyDetailWorkSurface } from "./property-detail-work-surface";
import { PropertyDetailContextRail } from "./property-detail-context-rail";
import { propertyDetailWorkspaceGridClassName } from "@/components/layout/entity-detail-workspace-grid";
import type { TransactionRow } from "@/components/modules/transactions/transactions-shared";
import { usePropertyVaultDetailCommandApi } from "@/components/modules/properties/property-vault-detail-command-context";
import { ArrowLeft, Upload, Trash2, DollarSign, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  kpBtnDangerSecondary,
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnSave,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { toast } from "sonner";
import { NewTaskModal } from "@/components/tasks/new-task-modal";

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
  usage?: { showings: number; openHouses: number };
  /** Set from ClientKeep property–client linking (not only via a deal). */
  primaryLinkedContact?: { id: string; firstName: string; lastName: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(p: string | number | null | undefined) {
  if (p == null) return "—";
  const n = typeof p === "string" ? parseFloat(p) : p;
  return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
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

function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <BrandSkeleton className="h-8 w-24 rounded-md" />
      <BrandSkeleton className="h-10 w-full rounded-lg" />
      <BrandSkeleton className="aspect-[2/1] max-h-[300px] w-full rounded-xl" />
      <div className={propertyDetailWorkspaceGridClassName}>
        <BrandSkeleton className="order-2 h-[420px] w-full rounded-xl lg:order-none lg:sticky lg:top-4" />
        <div className="order-1 flex min-h-[280px] min-w-0 flex-col gap-4 lg:order-none">
          <BrandSkeleton className="h-40 w-full rounded-xl" />
          <BrandSkeleton className="h-32 w-full rounded-xl" />
        </div>
        <BrandSkeleton className="order-3 h-48 w-full rounded-xl lg:order-none" />
      </div>
    </div>
  );
}

export function PropertyDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { hasCrm: hasCrmAccess } = useProductTier();
  const { data: property, error: loadError, isLoading, mutate: reloadProperty } = useSWR<Property>(
    id ? `/api/v1/properties/${id}` : null,
    apiFetcher,
    { errorRetryCount: 2, errorRetryInterval: 500 }
  );
  const {
    data: transactionsForProperty,
    error: transactionsListError,
    isLoading: transactionsListLoading,
  } = useSWR<TransactionRow[]>(
    hasCrmAccess && id ? `/api/v1/transactions?propertyId=${encodeURIComponent(id)}` : null,
    apiFetcher,
    { errorRetryCount: 1 }
  );
  const linkedContacts = useMemo(() => {
    if (!transactionsForProperty?.length) return [];
    const map = new Map<string, string>();
    for (const t of transactionsForProperty) {
      const c = t.primaryContact;
      if (c?.id) {
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "Contact";
        map.set(c.id, name);
      }
    }
    return Array.from(map.entries()).map(([contactId, name]) => ({ id: contactId, name }));
  }, [transactionsForProperty]);

  const primaryClientDisplay = useMemo(() => {
    const pl = property?.primaryLinkedContact;
    if (pl?.id) {
      const name = [pl.firstName, pl.lastName].filter(Boolean).join(" ").trim() || "Contact";
      return { id: pl.id, name };
    }
    if (linkedContacts[0]) return linkedContacts[0];
    return null;
  }, [property?.primaryLinkedContact, linkedContacts]);

  const extraDealContactCount = useMemo(() => {
    const primaryId = property?.primaryLinkedContact?.id ?? linkedContacts[0]?.id;
    if (!primaryId) return linkedContacts.length > 1 ? linkedContacts.length - 1 : 0;
    return linkedContacts.filter((c) => c.id !== primaryId).length;
  }, [property?.primaryLinkedContact?.id, linkedContacts]);

  const hasPrimaryClient = primaryClientDisplay != null;
  /** ClientKeep — property context for future linking UX; not TransactionHQ. */
  const linkClientHref = `/contacts?linkPropertyId=${encodeURIComponent(id)}`;

  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    mlsNumber: "", address1: "", address2: "", city: "", state: "", zip: "", listingPrice: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState<"archive" | "delete" | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const { setDetail } = usePropertyVaultDetailCommandApi();

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
    setIsEditing(true);
  }

  async function handleSaveEdit() {
    if (!property) return;
    setSaving(true);
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
      await reloadProperty({ ...property!, ...json.data, usage: property!.usage }, false);
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const handleArchiveProperty = useCallback(async () => {
    setLifecycleBusy("archive");
    try {
      const res = await fetch(`/api/v1/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not archive property");
      router.push("/properties");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archive failed");
    } finally {
      setLifecycleBusy(null);
      setLifecycleModalOpen(false);
    }
  }, [id, router]);

  const handleDeletePropertyForce = useCallback(async () => {
    setLifecycleBusy("delete");
    try {
      const res = await fetch(`/api/v1/properties/${id}?force=1`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Could not delete property");
      router.push("/properties");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setLifecycleBusy(null);
      setLifecycleModalOpen(false);
    }
  }, [id, router]);

  const requestDeleteProperty = useCallback(() => {
    if (!property) return;
    const s = property.usage?.showings ?? 0;
    const o = property.usage?.openHouses ?? 0;
    if (s > 0 || o > 0) {
      setLifecycleModalOpen(true);
      return;
    }
    if (
      !window.confirm(
        "Remove this property from your vault? It will be hidden from lists. This does not delete historical ShowingHQ records by id."
      )
    ) {
      return;
    }
    setLifecycleBusy("delete");
    fetch(`/api/v1/properties/${id}`, { method: "DELETE" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Delete failed");
        router.push("/properties");
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Delete failed"))
      .finally(() => setLifecycleBusy(null));
  }, [id, property, router]);

  const patchFlyer = useCallback((patch: Partial<PropertyFlyerFields>) => {
    void reloadProperty((current) => current ? { ...current, ...patch } : current, false);
  }, [reloadProperty]);

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setPhotoUploading(true);
      const formData = new FormData();
      formData.set("file", file);
      fetch(`/api/v1/properties/${id}/photo`, { method: "POST", body: formData })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          void reloadProperty((current) => current ? { ...current, imageUrl: json.data.imageUrl } : current, false);
        })
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Photo upload failed")
        )
        .finally(() => setPhotoUploading(false));
    },
    [id, reloadProperty]
  );

  const handleRemovePhoto = useCallback(() => {
    if (
      !confirm(
        "Remove this key photo? It will no longer appear here or on visitor sign-in pages."
      )
    )
      return;
    setPhotoUploading(true);
    fetch(`/api/v1/properties/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        void reloadProperty((current) => current ? { ...current, imageUrl: null } : current, false);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Could not remove photo")
      )
      .finally(() => setPhotoUploading(false));
  }, [id, reloadProperty]);

  useEffect(() => {
    if (!property) {
      setDetail(null);
      return;
    }
    setDetail({
      propertyId: id,
      onEdit: () => startEditing(property),
      onAddTask: () => setTaskModalOpen(true),
      onArchive: () => void handleArchiveProperty(),
      onDelete: () => requestDeleteProperty(),
      lifecycleBusy,
    });
    return () => setDetail(null);
  }, [
    id,
    property,
    lifecycleBusy,
    setDetail,
    handleArchiveProperty,
    requestDeleteProperty,
  ]);

  const loading = isLoading && !property;
  const error = loadError instanceof Error ? loadError.message : loadError ? String(loadError) : null;
  const transactionsError =
    transactionsListError instanceof Error
      ? transactionsListError.message
      : transactionsListError
        ? String(transactionsListError)
        : null;

  if (loading) return <LoadingState />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={() => void reloadProperty()} />;

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

  const listingTaskTitle = `Listing follow-up: ${property.address1}`;
  const listingTaskDescription = [fullAddressForReport, property.mlsNumber ? `MLS ${property.mlsNumber}` : null]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-5">
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

      {/* ── Hero + property header (anchor for readiness: key photo) ───────── */}
      <div
        id="property-workspace-hero"
        className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface scroll-mt-24"
      >
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
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white drop-shadow-md sm:text-xl">
                    {fullAddress}
                  </h1>
                  <p className="mt-0.5 text-sm text-white/90 drop-shadow">{locationLine}</p>
                </div>
                <div className="pointer-events-auto flex flex-wrap items-center gap-2">{priceBadge}</div>
              </div>
              <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1.5">
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
          </div>
        )}
      </div>

      <NewTaskModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultPropertyId={property.id}
        initialTitle={listingTaskTitle}
        initialDescription={listingTaskDescription}
      />

      {/* ── Workspace: identity | work surface | context ─────────────────────── */}
      <div className={propertyDetailWorkspaceGridClassName}>
        {/* Left: identity & record essentials */}
        <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <div
            id="property-identity"
            className="scroll-mt-24 space-y-4 rounded-xl border border-kp-outline bg-kp-surface p-5 shadow-sm"
          >
            {!hasPrimaryClient ? (
              <div
                className="rounded-lg border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-[11px] leading-snug text-amber-100"
                role="status"
              >
                <span className="font-semibold text-amber-50">Draft</span> — Link a client from ClientKeep to
                complete this listing.
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Property
              </p>
              <p className="mt-1 text-lg font-bold leading-snug text-kp-on-surface">{fullAddress}</p>
              <p className="mt-0.5 text-sm text-kp-on-surface-variant">{locationLine}</p>
              <p className="mt-2 text-[11px] leading-snug text-kp-on-surface-variant">
                {property.usage?.showings ?? 0} showing{(property.usage?.showings ?? 0) === 1 ? "" : "s"} ·{" "}
                {property.usage?.openHouses ?? 0} open house{(property.usage?.openHouses ?? 0) === 1 ? "" : "s"}
                {hasCrmAccess ? (
                  <>
                    {" "}
                    · {transactionsForProperty?.length ?? 0} linked deal
                    {(transactionsForProperty?.length ?? 0) === 1 ? "" : "s"}
                  </>
                ) : null}
              </p>
            </div>

            <div className="border-t border-kp-outline/40 pt-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                Primary client / owner
              </h2>
              {hasPrimaryClient && primaryClientDisplay ? (
                <div className="mt-2 space-y-1">
                  <Link
                    href={`/contacts/${primaryClientDisplay.id}`}
                    className="text-sm font-medium text-kp-teal hover:underline"
                  >
                    {primaryClientDisplay.name}
                  </Link>
                  {extraDealContactCount > 0 ? (
                    <p className="text-[10px] text-kp-on-surface-variant">
                      +{extraDealContactCount} more on linked deals
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-kp-on-surface-variant">No client linked</p>
                  <Link
                    href={linkClientHref}
                    className="mt-1 inline-block text-xs font-semibold text-kp-teal underline-offset-2 hover:underline"
                  >
                    Link from ClientKeep
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-kp-outline/40 pt-4">
              <h2 className="mb-3 text-sm font-semibold text-kp-on-surface">Details &amp; notes</h2>

              {isEditing ? (
                <div className="space-y-3">
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
                  {property.mlsNumber && <InfoRow label="MLS #" value={property.mlsNumber} />}
                  <InfoRow label="Listing price" value={formatPrice(property.listingPrice)} />
                  <InfoRow label="City" value={property.city} />
                  <InfoRow label="State" value={`${property.state} ${property.zip}`} />
                  {property.notes && <InfoRow label="Notes" value={property.notes} />}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: listing readiness & workflows */}
        <div className="order-1 min-w-0 lg:order-none">
          <PropertyDetailWorkSurface
            property={property}
            onFlyerPatch={patchFlyer}
            hasPrimaryClient={hasPrimaryClient}
            linkClientHref={linkClientHref}
          />
        </div>

        {/* Right: deals, people, visitor/seller signals */}
        <PropertyDetailContextRail
          propertyId={id}
          fullAddressForReport={fullAddressForReport}
          transactions={transactionsForProperty}
          transactionsLoading={hasCrmAccess && transactionsListLoading}
          transactionsError={transactionsError}
          hasCrmAccess={hasCrmAccess}
          transactionCount={transactionsForProperty?.length ?? 0}
        />
      </div>

      <BrandModal
        open={lifecycleModalOpen}
        onOpenChange={setLifecycleModalOpen}
        title="Property in use"
        description="This property still has linked showings or open-house events."
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
              onClick={() => void handleArchiveProperty()}
            >
              {lifecycleBusy === "archive" ? "Archiving…" : "Archive instead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnDangerSecondary, "h-9 text-[12px]")}
              disabled={lifecycleBusy !== null}
              onClick={() => void handleDeletePropertyForce()}
            >
              {lifecycleBusy === "delete" ? "Deleting…" : "Delete anyway"}
            </Button>
          </div>
        }
      >
        {property ? (
          <div className="space-y-2 text-[12px] text-kp-on-surface">
            <p className="font-medium text-kp-on-surface">This property is used in:</p>
            <ul className="list-inside list-disc text-kp-on-surface-variant">
              <li>
                {property.usage?.showings ?? 0} showing
                {(property.usage?.showings ?? 0) === 1 ? "" : "s"}
              </li>
              <li>
                {property.usage?.openHouses ?? 0} open house
                {(property.usage?.openHouses ?? 0) === 1 ? "" : "s"}
              </li>
            </ul>
            <p className="text-kp-on-surface-variant">
              Prefer <span className="font-medium text-kp-on-surface">Archive instead</span> unless you are
              intentionally cleaning up test data.
            </p>
          </div>
        ) : null}
      </BrandModal>
    </div>
  );
}
