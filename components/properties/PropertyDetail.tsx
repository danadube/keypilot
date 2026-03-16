"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { PropertyFeedbackSummary } from "@/components/properties/PropertyFeedbackSummary";

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

export function PropertyDetail({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatPrice = (p: string | number | null | undefined) => {
    if (p == null) return "—";
    const n = typeof p === "string" ? parseFloat(p) : p;
    return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
  };
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const hasFlyer = !!(property.flyerUrl?.trim() && property.flyerEnabled !== false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {property.address1}
          {property.address2 && ` ${property.address2}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
          <CardDescription>
            {property.city}, {property.state} {property.zip}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {property.mlsNumber && (
            <p>
              <span className="font-medium">MLS #:</span> {property.mlsNumber}
            </p>
          )}
          <p>
            <span className="font-medium">Listing price:</span>{" "}
            {formatPrice(property.listingPrice)}
          </p>
          {property.notes && (
            <p>
              <span className="font-medium">Notes:</span> {property.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Property flyer
          </CardTitle>
          <CardDescription>
            PDF flyer sent to visitors after open house sign-in. Created in Canva or elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flyerError && (
            <p className="text-sm text-destructive">{flyerError}</p>
          )}
          {hasFlyer ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{property.flyerFilename ?? "Flyer"}</span>
                {property.flyerUploadedAt && (
                  <span className="text-muted-foreground">
                    · {formatDate(property.flyerUploadedAt)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={property.flyerUrl!} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Preview
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={flyerUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {flyerUploading ? "Uploading…" : "Replace"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={flyerUploading}
                  onClick={handleRemoveFlyer}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            </>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFlyerUpload}
              />
              <Button
                variant="outline"
                disabled={flyerUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {flyerUploading ? "Uploading…" : "Upload flyer (PDF)"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open houses</CardTitle>
          <CardDescription>Events at this property</CardDescription>
        </CardHeader>
        <CardContent>
          {!property.openHouses?.length ? (
            <p className="text-muted-foreground py-4">
              No open houses yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {property.openHouses.map((oh) => (
                <li key={oh.id} className="flex items-center justify-between">
                  <span>
                    {oh.title} — {formatDate(oh.startAt)}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/open-houses/${oh.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button className="mt-4" asChild>
            <Link href="/open-houses/new">New open house</Link>
          </Button>
        </CardContent>
      </Card>

      <PropertyFeedbackSummary propertyId={id} />
    </div>
  );
}
