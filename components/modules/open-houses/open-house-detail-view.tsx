"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowLeft,
  Users,
  Mail,
  BarChart2,
  QrCode,
  FileText,
  Upload,
  ExternalLink,
  Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type OpenHouseData = {
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

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(s: string): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "SCHEDULED": return "upcoming";
    case "ACTIVE":    return "active";
    case "COMPLETED": return "sold";
    case "CANCELLED": return "cancelled";
    default:          return "pending";
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// ── Component ──────────────────────────────────────────────────────────────────

export function OpenHouseDetailView({ id }: { id: string }) {
  const [oh, setOh] = useState<OpenHouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyerUploading, setFlyerUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const refresh = useCallback(() => {
    return fetch(`/api/v1/open-houses/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOh(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    refresh();
  }, [id, refresh]);

  const handleStatusChange = (newStatus: string) => {
    if (!id || newStatus === oh?.status) return;
    setUpdatingStatus(true);
    fetch(`/api/v1/open-houses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setOh((prev) => (prev ? { ...prev, status: newStatus } : null));
      })
      .catch(() => setError("Failed to update status"))
      .finally(() => setUpdatingStatus(false));
  };

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
          refresh();
        }}
      />
    );

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const totalDrafts =
    oh.draftStatusCounts.DRAFT +
    oh.draftStatusCounts.REVIEWED +
    oh.draftStatusCounts.SENT_MANUAL +
    oh.draftStatusCounts.ARCHIVED;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-kp-on-surface-variant hover:bg-kp-surface-high hover:text-kp-on-surface"
            asChild
          >
            <Link href="/open-houses">
              <ArrowLeft className="h-4 w-4" />
              Open houses
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">{oh.title}</h1>
            <p className="mt-0.5 text-sm text-kp-on-surface-variant">
              {oh.property.address1}, {oh.property.city}, {oh.property.state}{" "}
              {oh.property.zip}
            </p>
          </div>
          <StatusBadge variant={statusVariant(oh.status)}>
            {oh.status.charAt(0) + oh.status.slice(1).toLowerCase()}
          </StatusBadge>
        </div>

        {/* Status selector */}
        <Select value={oh.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
          <SelectTrigger className="h-8 w-[140px] border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Two-column grid: stats + QR ─────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Quick stats */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-kp-on-surface">Quick stats</h2>
          <p className="mb-4 text-xs text-kp-on-surface-variant">{formatDate(oh.startAt)}</p>

          <div className="space-y-3">
            {/* Time */}
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
              <span className="text-sm text-kp-on-surface">
                {formatTime(oh.startAt)}–{formatTime(oh.endAt)}
              </span>
            </div>

            {/* Visitors */}
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
              <span className="text-sm font-medium text-kp-on-surface">
                {oh._count.visitors} visitor{oh._count.visitors !== 1 ? "s" : ""}
              </span>
            </div>
            {oh._count.visitors > 0 && (
              <div className="ml-6 flex flex-wrap gap-3 text-xs text-kp-on-surface-variant">
                <span>With agent: {oh.visitorBreakdown.hasAgentTrue}</span>
                <span>Without: {oh.visitorBreakdown.hasAgentFalse}</span>
                <span>Unknown: {oh.visitorBreakdown.unknownAgentStatus}</span>
              </div>
            )}

            {/* Drafts */}
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
              <span className="text-sm text-kp-on-surface">
                {totalDrafts} follow-up draft{totalDrafts !== 1 ? "s" : ""}
              </span>
            </div>
            {totalDrafts > 0 && (
              <div className="ml-6 flex flex-wrap gap-3 text-xs text-kp-on-surface-variant">
                {oh.draftStatusCounts.DRAFT > 0 && <span className="text-kp-gold">Draft: {oh.draftStatusCounts.DRAFT}</span>}
                {oh.draftStatusCounts.REVIEWED > 0 && <span className="text-kp-teal">Reviewed: {oh.draftStatusCounts.REVIEWED}</span>}
                {oh.draftStatusCounts.SENT_MANUAL > 0 && <span className="text-emerald-400">Sent: {oh.draftStatusCounts.SENT_MANUAL}</span>}
                {oh.draftStatusCounts.ARCHIVED > 0 && <span>Archived: {oh.draftStatusCounts.ARCHIVED}</span>}
              </div>
            )}
          </div>

          {/* Action links */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-kp-outline pt-4">
            <Button
              size="sm"
              className="h-8 border-0 bg-kp-teal px-3 text-xs text-kp-bg hover:opacity-90"
              asChild
            >
              <Link href={`/open-houses/${id}/visitors`}>
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Visitors
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <Link href={`/open-houses/${id}/follow-ups`}>
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Follow-ups
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <Link href={`/open-houses/${id}/report`}>
                <BarChart2 className="mr-1.5 h-3.5 w-3.5" />
                Report
              </Link>
            </Button>
          </div>
        </div>

        {/* QR code */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">QR Code</h2>
          </div>
          <p className="mb-4 text-xs text-kp-on-surface-variant">
            Share this link or scan for visitor sign-in
          </p>

          {oh.qrCodeDataUrl && (
            <div className="mb-4 flex justify-center">
              {/* QR image needs white bg to be scannable */}
              <div className="rounded-lg border border-kp-outline bg-kp-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={oh.qrCodeDataUrl}
                  alt="QR Code for visitor sign-in"
                  width={160}
                  height={160}
                />
              </div>
            </div>
          )}

          <p className="mb-4 break-all text-center font-mono text-xs text-kp-on-surface-variant">
            {baseUrl}/oh/{oh.qrSlug}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 border-0 bg-kp-teal px-3 text-xs text-kp-bg hover:opacity-90"
              asChild
            >
              <Link href={`/open-houses/${id}/sign-in`}>
                <QrCode className="mr-1.5 h-3.5 w-3.5" />
                Sign-in display
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <a href={`${baseUrl}/oh/${oh.qrSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open sign-in page
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Flyer ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <div className="mb-1 flex items-center gap-2">
          <FileText className="h-4 w-4 text-kp-on-surface-variant" />
          <h2 className="text-sm font-semibold text-kp-on-surface">Property flyer</h2>
        </div>
        <p className="mb-4 text-xs text-kp-on-surface-variant">
          Upload a PDF to email visitors after they sign in. PDF only, max 10 MB.
        </p>

        {oh.flyerUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <a href={oh.flyerUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
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
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
                disabled={flyerUploading}
                asChild={false}
              >
                <span>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  {flyerUploading ? "Uploading…" : "Replace flyer"}
                </span>
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
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              disabled={flyerUploading}
              asChild={false}
            >
              <span>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {flyerUploading ? "Uploading…" : "Upload PDF flyer"}
              </span>
            </Button>
          </label>
        )}
      </div>
    </div>
  );
}
