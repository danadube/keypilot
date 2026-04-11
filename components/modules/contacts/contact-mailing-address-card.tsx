"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { ContactDetailSection } from "./contact-detail-section";

type ContactMailingAddressCardProps = {
  street1: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  saving: boolean;
  onStreet1Change: (v: string) => void;
  onStreet2Change: (v: string) => void;
  onCityChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onZipChange: (v: string) => void;
  onSave: () => void;
  /** Collapsible panel for secondary rails (default: full card). */
  collapsible?: boolean;
};

export function ContactMailingAddressCard({
  street1,
  street2,
  city,
  state,
  zip,
  saving,
  onStreet1Change,
  onStreet2Change,
  onCityChange,
  onStateChange,
  onZipChange,
  onSave,
  collapsible = false,
}: ContactMailingAddressCardProps) {
  const fields = (
    <div className="grid gap-2">
        <Input
          placeholder="Street line 1"
          value={street1}
          onChange={(e) => onStreet1Change(e.target.value)}
          className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
        />
        <Input
          placeholder="Street line 2 (optional)"
          value={street2}
          onChange={(e) => onStreet2Change(e.target.value)}
          className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Input
            placeholder="City"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface sm:col-span-2"
          />
          <Input
            placeholder="ST"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
          />
          <Input
            placeholder="ZIP"
            value={zip}
            onChange={(e) => onZipChange(e.target.value)}
            className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(kpBtnSecondary, "mt-1 h-8 w-fit border-transparent text-xs")}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save mailing address"}
        </Button>
    </div>
  );

  if (collapsible) {
    return (
      <details className="group rounded-xl border border-kp-outline/70 bg-kp-surface-high/15 [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-left">
          <span className="text-xs font-semibold text-kp-on-surface">Mailing address</span>
          <p className="mt-0.5 text-[11px] text-kp-on-surface-variant">
            FarmTrackr exports & labels — optional
          </p>
        </summary>
        <div className="border-t border-kp-outline/60 px-3 pb-3 pt-2">{fields}</div>
      </details>
    );
  }

  return (
    <ContactDetailSection
      title="Mailing address"
      description="Used for FarmTrackr mailing CSV and label exports. Optional."
    >
      {fields}
    </ContactDetailSection>
  );
}
