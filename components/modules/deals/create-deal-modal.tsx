"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  X,
  Search,
  User,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
};

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function contactLabel(c: ContactOption) {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

function propertyLabel(p: PropertyOption) {
  return `${p.address1}, ${p.city}, ${p.state} ${p.zip}`;
}

function matchContact(c: ContactOption, q: string) {
  const lq = q.toLowerCase();
  return (
    contactLabel(c).toLowerCase().includes(lq) ||
    (c.email?.toLowerCase().includes(lq) ?? false)
  );
}

function matchProperty(p: PropertyOption, q: string) {
  const lq = q.toLowerCase();
  return propertyLabel(p).toLowerCase().includes(lq);
}

// ── SearchPicker ──────────────────────────────────────────────────────────────

/**
 * Searchable list picker used for both Contact and Property selection.
 * Shows a text filter + scrollable results. Click to select; shows selected
 * item with a "Change" button once confirmed.
 */
function SearchPicker<T extends { id: string }>({
  label,
  icon: Icon,
  items,
  loading,
  selected,
  onSelect,
  renderLabel,
  renderSublabel,
  filterFn,
  placeholder,
  emptyText,
}: {
  label: string;
  icon: React.ElementType;
  items: T[];
  loading: boolean;
  selected: T | null;
  onSelect: (item: T | null) => void;
  renderLabel: (item: T) => string;
  renderSublabel?: (item: T) => string | null;
  filterFn: (item: T, query: string) => boolean;
  placeholder: string;
  emptyText: string;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? items.filter((item) => filterFn(item, query))
    : items;

  // When selected changes, clear search
  useEffect(() => {
    if (selected) setQuery("");
  }, [selected]);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          {label}
        </p>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-kp-teal/30 bg-kp-teal/5 px-4 py-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-kp-on-surface">
                {renderLabel(selected)}
              </p>
              {renderSublabel?.(selected) && (
                <p className="truncate text-xs text-kp-on-surface-variant">
                  {renderSublabel(selected)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="shrink-0 text-xs font-medium text-kp-on-surface-variant underline-offset-2 hover:text-kp-on-surface hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
        {label}
      </p>

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-kp-on-surface-variant" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-9 w-full rounded-lg border border-kp-outline bg-kp-surface-high pl-8 pr-8",
            "text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder",
            "transition-colors focus:border-kp-teal/60 focus:outline-none focus:ring-1 focus:ring-kp-teal/40"
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-kp-on-surface-variant hover:text-kp-on-surface"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results list */}
      <div className="max-h-44 overflow-y-auto rounded-lg border border-kp-outline bg-kp-surface-high">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-kp-on-surface-variant" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5">
            <Icon className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
            <p className="text-sm text-kp-on-surface-variant">
              {items.length === 0 ? emptyText : "No matches"}
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-kp-surface-higher",
                    i !== 0 && "border-t border-kp-outline"
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface-variant" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-kp-on-surface">
                      {renderLabel(item)}
                    </p>
                    {renderSublabel?.(item) && (
                      <p className="truncate text-xs text-kp-on-surface-variant">
                        {renderSublabel(item)}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── CreateDealModal ───────────────────────────────────────────────────────────

interface CreateDealModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal for creating a new deal by linking a contact + property.
 *
 * On success, redirects to /deals/[newId].
 * Uses only kp-* dark design tokens — no shadcn.
 */
export function CreateDealModal({ open, onClose }: CreateDealModalProps) {
  const router = useRouter();

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyOption | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts + properties when modal opens
  useEffect(() => {
    if (!open) return;

    setSelectedContact(null);
    setSelectedProperty(null);
    setError(null);

    setLoadingContacts(true);
    fetch("/api/v1/contacts")
      .then((r) => r.json())
      .then((j) => setContacts(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingContacts(false));

    setLoadingProperties(true);
    fetch("/api/v1/properties")
      .then((r) => r.json())
      .then((j) => setProperties(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingProperties(false));
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !selectedProperty) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          propertyId: selectedProperty.id,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      toast.success("Deal created");
      onClose();
      router.push(`/deals/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedContact && !!selectedProperty && !submitting;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-kp-bg/70 backdrop-blur-sm"
        onClick={() => { if (!submitting) onClose(); }}
        aria-hidden
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-deal-title"
        className="relative z-10 w-full max-w-lg rounded-2xl border border-kp-outline bg-kp-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-kp-outline px-6 py-5">
          <div>
            <h2
              id="create-deal-title"
              className="font-headline text-lg font-semibold text-kp-on-surface"
            >
              New deal
            </h2>
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              Link a contact and a property to start tracking a deal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { if (!submitting) onClose(); }}
            disabled={submitting}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">

            {/* Contact picker */}
            <SearchPicker<ContactOption>
              label="Contact"
              icon={User}
              items={contacts}
              loading={loadingContacts}
              selected={selectedContact}
              onSelect={setSelectedContact}
              renderLabel={contactLabel}
              renderSublabel={(c) => c.email}
              filterFn={matchContact}
              placeholder="Search contacts by name or email…"
              emptyText="No contacts found. Contacts are created when visitors sign in at open houses."
            />

            {/* Property picker */}
            <SearchPicker<PropertyOption>
              label="Property"
              icon={MapPin}
              items={properties}
              loading={loadingProperties}
              selected={selectedProperty}
              onSelect={setSelectedProperty}
              renderLabel={propertyLabel}
              filterFn={matchProperty}
              placeholder="Search properties by address…"
              emptyText="No properties found. Add a property first."
            />

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-kp-outline px-6 py-4">
            <p className="text-xs text-kp-on-surface-variant">
              {!selectedContact && !selectedProperty
                ? "Select a contact and property to continue."
                : !selectedContact
                ? "Select a contact to continue."
                : !selectedProperty
                ? "Select a property to continue."
                : "Ready to create deal."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (!submitting) onClose(); }}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm text-kp-on-surface-variant transition-colors hover:bg-kp-surface-high hover:text-kp-on-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors",
                  canSubmit
                    ? "bg-kp-gold text-kp-bg hover:bg-kp-gold-bright"
                    : "cursor-not-allowed bg-kp-surface-high text-kp-on-surface-variant"
                )}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {submitting ? "Creating…" : "Create deal"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
