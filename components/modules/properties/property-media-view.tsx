"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PropertyVaultPropertySubnav } from "./property-vault-property-subnav";
import { PropertyKeyPhotoPanel } from "./property-key-photo-panel";
import { ArrowLeft } from "lucide-react";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  imageUrl?: string | null;
};

export function PropertyMediaView({ id }: { id: string }) {
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
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const patchImage = useCallback((imageUrl: string | null) => {
    setProperty((p) => (p ? { ...p, imageUrl } : p));
  }, []);

  if (loading) return <PageLoading message="Loading media…" />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const locationLine = [property.city, property.state, property.zip].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div>
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
      </div>

      <PropertyVaultPropertySubnav propertyId={id} current="media" />

      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Photos &amp; media</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          {property.address1}
          {property.address2 ? ` ${property.address2}` : ""} · {locationLine}
        </p>
      </div>

      <PropertyKeyPhotoPanel propertyId={id} imageUrl={property.imageUrl} onImagePatch={patchImage} />

      <p className="text-xs text-kp-on-surface-variant">
        Need the full property record?{" "}
        <Link href={`/properties/${id}`} className="font-medium text-kp-teal hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
