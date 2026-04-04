"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PropertyVaultPropertySubnav } from "./property-vault-property-subnav";
import { PropertyFlyerPanel, type PropertyFlyerFields } from "./property-flyer-panel";
import { ArrowLeft } from "lucide-react";
import { UI_COPY } from "@/lib/ui-copy";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  flyerUrl?: string | null;
  flyerFilename?: string | null;
  flyerUploadedAt?: string | null;
  flyerEnabled?: boolean | null;
};

export function PropertyDocumentsView({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/properties/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperty(json.data);
      })
      .catch(() => setError(UI_COPY.errors.load("property")))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patchFlyer = useCallback((patch: Partial<PropertyFlyerFields>) => {
    setProperty((p) => (p ? { ...p, ...patch } : p));
  }, []);

  if (loading) return <PageLoading message="Loading documents…" />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const locationLine = [property.city, property.state, property.zip].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-6">
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

      <PropertyVaultPropertySubnav propertyId={id} current="documents" />

      <div className="space-y-1">
        <h1 className="text-lg font-semibold leading-snug text-kp-on-surface">
          {property.address1}
          {property.address2 ? ` ${property.address2}` : ""}
        </h1>
        <p className="text-xs text-kp-on-surface-variant">
          {locationLine}
          <span className="text-kp-on-surface-muted"> · </span>
          Documents
        </p>
      </div>

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

      <p className="text-xs text-kp-on-surface-variant">
        Need the full property record?{" "}
        <Link href={`/properties/${id}`} className="font-medium text-kp-teal hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
