"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { InterestBadge } from "@/components/shared/InterestBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { InviteHostDialog } from "@/components/open-houses/InviteHostDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  CheckSquare,
  QrCode,
  Copy,
  RefreshCw,
  FileText,
  ArrowLeft,
} from "lucide-react";

type OpenHouseData = {
  hostUserId?: string;
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  qrSlug: string;
  agentName: string | null;
  trafficLevel: string | null;
  feedbackTags: string[] | null;
  hostNotes: string | null;
  property: { address1: string; city: string; state: string; zip: string };
  listingAgent?: { id: string; name: string; email: string } | null;
  hostAgent?: { id: string; name: string; email: string } | null;
  visitors: {
    id: string;
    leadStatus: string | null;
    interestLevel: string | null;
    submittedAt: string;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }[];
  drafts: { id: string; subject: string; status: string }[];
  _count: { visitors: number };
  draftStatusCounts: { DRAFT: number; REVIEWED: number; SENT_MANUAL: number; ARCHIVED: number };
  qrCodeDataUrl: string;
};

function draftStatusClass(status: string) {
  if (status === "SENT_MANUAL") return "text-emerald-400";
  if (status === "REVIEWED") return "text-kp-teal";
  if (status === "ARCHIVED") return "text-kp-on-surface-variant";
  return "text-kp-gold"; // DRAFT
}

export default function ShowingHQOpenHouseDetailPage() {
  const params = useParams();
  const openHouseId = params.openHouseId as string;
  const [data, setData] = useState<OpenHouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load open house"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!openHouseId || newStatus === data?.status) return;
      setUpdatingStatus(true);
      fetch(`/api/v1/open-houses/${openHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          loadData();
        })
        .catch(() => setError("Failed to update status"))
        .finally(() => setUpdatingStatus(false));
    },
    [openHouseId, data?.status, loadData]
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const address = data?.property
    ? [data.property.address1, data.property.city, data.property.state, data.property.zip]
        .filter(Boolean)
        .join(", ")
    : "";

  const signInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/oh/${data?.qrSlug ?? ""}`
      : "";

  const handleCopyLink = () => {
    if (!signInUrl) return;
    navigator.clipboard.writeText(signInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateQr = async () => {
    if (!openHouseId) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}/regenerate-qr`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const totalVisitors = data?._count?.visitors ?? 0;
  const contactsCaptured = data?.visitors?.length ?? 0;
  const followUpsCount =
    (data?.draftStatusCounts?.DRAFT ?? 0) +
    (data?.draftStatusCounts?.REVIEWED ?? 0) +
    (data?.draftStatusCounts?.SENT_MANUAL ?? 0) +
    (data?.draftStatusCounts?.ARCHIVED ?? 0);

  const fullName = (c: { firstName: string; lastName: string }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

  if (loading) return <PageLoading message="Loading open house..." />;
  if (error || !data)
    return (
      <ErrorMessage
        message={error ?? "Open house not found"}
        onRetry={loadData}
      />
    );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
            asChild
          >
            <Link href="/showing-hq">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">{data.title}</h1>
            <p className="text-sm text-kp-on-surface-variant">
              {address} · {formatDate(data.startAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={data.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="h-8 w-[140px] border-kp-outline bg-kp-surface-high text-xs text-kp-on-surface">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-kp-outline bg-kp-surface">
              <SelectItem value="SCHEDULED" className="text-kp-on-surface">Scheduled</SelectItem>
              <SelectItem value="ACTIVE" className="text-kp-on-surface">Active</SelectItem>
              <SelectItem value="COMPLETED" className="text-kp-on-surface">Completed</SelectItem>
              <SelectItem value="CANCELLED" className="text-kp-on-surface">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className={cn(kpBtnSecondary, "h-8 text-xs")}
            asChild
          >
            <Link href={`/open-houses/${openHouseId}/report`}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Seller report
            </Link>
          </Button>
          <InviteHostDialog openHouseId={openHouseId} onInviteSent={loadData} />
          <Button
            size="sm"
            variant="outline"
            className={cn(kpBtnSecondary, "h-8 text-xs")}
            asChild
          >
            <Link href="/open-houses">All open houses</Link>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kp-teal/10 text-kp-teal">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-kp-on-surface">{totalVisitors}</p>
              <p className="text-xs text-kp-on-surface-variant">Total visitors</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kp-teal/10 text-kp-teal">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-kp-on-surface">{contactsCaptured}</p>
              <p className="text-xs text-kp-on-surface-variant">Contacts captured</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kp-gold/10 text-kp-gold">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-kp-on-surface">{followUpsCount}</p>
              <p className="text-xs text-kp-on-surface-variant">Follow-ups created</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visitors + Follow-ups */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Visitor list */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Visitors</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">
            {data.visitors.length} sign-in{data.visitors.length !== 1 ? "s" : ""}
          </p>
          {data.visitors.length === 0 ? (
            <p className="py-6 text-center text-sm text-kp-on-surface-variant">
              No visitors yet. Share your sign-in link.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kp-outline">
                    <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Name</th>
                    <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Email</th>
                    <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Interest</th>
                    <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Sign-in</th>
                    <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Status</th>
                    <th className="pb-2 w-[80px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-kp-outline">
                  {data.visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-kp-surface-high/50">
                      <td className="py-2 font-medium text-kp-on-surface">{fullName(v.contact)}</td>
                      <td className="py-2 text-kp-on-surface-variant">{v.contact.email ?? "—"}</td>
                      <td className="py-2">
                        <InterestBadge interestLevel={v.interestLevel} />
                      </td>
                      <td className="py-2 text-kp-on-surface-variant">{formatDateTime(v.submittedAt)}</td>
                      <td className="py-2">
                        <LeadStatusBadge status={v.leadStatus} />
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(kpBtnTertiary, "h-7 text-xs")}
                          asChild
                        >
                          <Link href={`/showing-hq/visitors/${v.id}`}>Profile</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Follow-ups */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Follow-ups</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">Tasks generated from this open house</p>
          {data.drafts.length === 0 ? (
            <p className="py-6 text-center text-sm text-kp-on-surface-variant">
              No follow-up drafts yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.drafts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-kp-outline bg-kp-surface-high p-3"
                >
                  <p className="font-medium text-kp-on-surface">{d.subject}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${draftStatusClass(d.status)}`}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(kpBtnSecondary, "h-7 text-xs")}
                      asChild
                    >
                      <Link href={`/open-houses/${openHouseId}/follow-ups`}>View</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-xs")}
              asChild
            >
              <Link href={`/open-houses/${openHouseId}/follow-ups`}>Manage follow-ups</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* QR sign-in link */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        <p className="mb-1 text-sm font-semibold text-kp-on-surface">QR sign-in link</p>
        <p className="mb-4 text-xs text-kp-on-surface-variant">
          Share this link or scan the QR code for visitor sign-in
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {data.qrCodeDataUrl && (
            <div className="shrink-0">
              <div className="rounded-lg border border-kp-outline bg-kp-surface p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrCodeDataUrl}
                  alt="QR Code"
                  width={120}
                  height={120}
                />
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <p className="break-all text-sm text-kp-on-surface-variant">{signInUrl}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
                onClick={handleCopyLink}
                disabled={!signInUrl}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                onClick={handleRegenerateQr}
                disabled={regenerating}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
                {regenerating ? "Regenerating..." : "Regenerate QR"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                asChild
              >
                <Link href={`/open-houses/${openHouseId}/sign-in`}>
                  <QrCode className="mr-1.5 h-3.5 w-3.5" />
                  Host sign-in
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                asChild
              >
                <Link href={`/open-houses/${openHouseId}/sign-in/print`}>Print QR poster</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                asChild
              >
                <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                  Open visitor page
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
