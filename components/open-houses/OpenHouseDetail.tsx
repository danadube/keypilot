"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type OpenHouseDetail = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  qrSlug: string;
  flyerUrl?: string | null;
  property: { address1: string; city: string; state: string; zip: string };
  listingAgent?: { id: string; name: string; email: string } | null;
  hostAgent?: { id: string; name: string; email: string } | null;
  agentName?: string | null;
  _count: { visitors: number };
  visitorBreakdown: { total: number; hasAgentTrue: number; hasAgentFalse: number; unknownAgentStatus: number };
  draftStatusCounts: { DRAFT: number; REVIEWED: number; SENT_MANUAL: number; ARCHIVED: number };
  qrCodeDataUrl: string;
};

export function OpenHouseDetail({ id }: { id: string }) {
  const [oh, setOh] = useState<OpenHouseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyerUploading, setFlyerUploading] = useState(false);

  const refresh = () => {
    return fetch(`/api/v1/open-houses/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOh(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    refresh();
  }, [id]);

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !oh) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFlyerUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/v1/open-houses/${id}/flyer`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      await refresh();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setFlyerUploading(false);
      e.target.value = "";
    }
  };

  if (loading) return <PageLoading message="Loading open house..." />;
  if (error || !oh)
    return (
      <ErrorMessage
        message={error || "Open house not found"}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetch(`/api/v1/open-houses/${id}`)
            .then((res) => res.json())
            .then((json) => {
              if (json.error) setError(json.error.message);
              else setOh(json.data);
            })
            .catch(() => setError("Failed to load"))
            .finally(() => setLoading(false));
        }}
      />
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/open-houses">← Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{oh.title}</h1>
            <p className="text-muted-foreground">
              {oh.property.address1}, {oh.property.city}, {oh.property.state}{" "}
              {oh.property.zip}
            </p>
          </div>
        </div>
        <Badge
          variant={
            oh.status === "ACTIVE" || oh.status === "SCHEDULED"
              ? "default"
              : oh.status === "COMPLETED"
                ? "secondary"
                : "outline"
          }
        >
          {oh.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick stats</CardTitle>
            <CardDescription>{formatDate(oh.startAt)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <span className="font-medium">Time:</span> {formatTime(oh.startAt)}–{formatTime(oh.endAt)}
            </p>
            <p>
              <span className="font-medium">Visitors:</span> {oh._count.visitors}
            </p>
            {oh._count.visitors > 0 && (
              <div className="text-sm text-muted-foreground">
                With agent: {oh.visitorBreakdown.hasAgentTrue} · Without:{" "}
                {oh.visitorBreakdown.hasAgentFalse} · Unknown:{" "}
                {oh.visitorBreakdown.unknownAgentStatus}
              </div>
            )}
            <p>
              <span className="font-medium">Follow-up drafts:</span>{" "}
              {oh.draftStatusCounts.DRAFT + oh.draftStatusCounts.REVIEWED +
                oh.draftStatusCounts.SENT_MANUAL + oh.draftStatusCounts.ARCHIVED}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QR Code</CardTitle>
            <CardDescription>
              Share this link or scan for visitor sign-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {oh.qrCodeDataUrl && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oh.qrCodeDataUrl}
                  alt="QR Code"
                  width={160}
                  height={160}
                  className="rounded border"
                />
              </div>
            )}
            <p className="break-all text-sm text-muted-foreground">
              {baseUrl}/oh/{oh.qrSlug}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/open-houses/${id}/visitors`}>Visitors</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/open-houses/${id}/follow-ups`}>Follow-ups</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/open-houses/${id}/report`}>Report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property flyer</CardTitle>
          <CardDescription>
            Upload a PDF to email visitors after they sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {oh.flyerUrl ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href={oh.flyerUrl} target="_blank" rel="noopener noreferrer">
                  View flyer
                </a>
              </Button>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFlyerUpload}
                  disabled={flyerUploading}
                />
                <Button variant="outline" size="sm" type="button" disabled={flyerUploading}>
                  {flyerUploading ? "Uploading..." : "Replace flyer"}
                </Button>
              </label>
            </div>
          ) : (
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFlyerUpload}
                disabled={flyerUploading}
              />
              <Button variant="outline" size="sm" type="button" disabled={flyerUploading}>
                {flyerUploading ? "Uploading..." : "Upload PDF flyer"}
              </Button>
            </label>
          )}
          <p className="text-xs text-muted-foreground">PDF only, max 10MB. Visitors with an email receive it automatically after sign-in.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Manage this open house</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/open-houses/${id}/visitors`}>View visitors</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/open-houses/${id}/follow-ups`}>Follow-ups</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/open-houses/${id}/report`}>Seller report</Link>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`${baseUrl}/oh/${oh.qrSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open sign-in page
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
