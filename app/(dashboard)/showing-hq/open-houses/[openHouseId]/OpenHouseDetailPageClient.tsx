"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  OpenHousePrepWorkspace,
  OPEN_HOUSE_INVITE_HOST_PRIMARY_ANCHOR_ID,
} from "@/components/showing-hq/open-house-prep-workspace";
import { OpenHouseFlyerUploadButton } from "@/components/showing-hq/OpenHouseFlyerUploadButton";
import { ShowingHqWorkflowTabStrip } from "@/components/showing-hq/ShowingHqWorkflowTabStrip";
import {
  normalizeShowingHqWorkflowTab,
  openHouseWorkflowTabHref,
  type ShowingHqWorkflowTab,
} from "@/lib/showing-hq/showing-workflow-hrefs";
import { buildOpenHousePrepChecklist } from "@/lib/showing-hq/prep-checklist";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OpenHouseData = {
  hostUserId?: string;
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  qrSlug: string;
  flyerUrl?: string | null;
  flyerOverrideUrl?: string | null;
  agentName: string | null;
  trafficLevel: string | null;
  feedbackTags: string[] | null;
  hostNotes: string | null;
  notes?: string | null;
  prepChecklistFlags?: Record<string, unknown> | null;
  hostAgentId?: string | null;
  hosts?: { id: string }[];
  property: { id?: string; address1: string; city: string; state: string; zip: string; flyerUrl?: string | null };
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

function isoToDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTimeLocal(dateStr: string, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateStr);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

function openHouseStatusLabel(status: string) {
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ACTIVE") return "Active";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return status.replace(/_/g, " ");
}

function draftStatusClass(status: string) {
  if (status === "SENT_MANUAL") return "text-emerald-400";
  if (status === "REVIEWED") return "text-kp-teal";
  if (status === "ARCHIVED") return "text-kp-on-surface-variant";
  return "text-kp-gold"; // DRAFT
}

export function OpenHouseDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openHouseId = params.openHouseId as string;
  const tab = normalizeShowingHqWorkflowTab(searchParams.get("tab"));

  const setTab = useCallback(
    (t: ShowingHqWorkflowTab) => {
      router.replace(openHouseWorkflowTabHref(openHouseId, t), { scroll: false });
    },
    [router, openHouseId]
  );
  const [data, setData] = useState<OpenHouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailStartDate, setDetailStartDate] = useState("");
  const [detailStartTime, setDetailStartTime] = useState("");
  const [detailEndDate, setDetailEndDate] = useState("");
  const [detailEndTime, setDetailEndTime] = useState("");
  const [detailNotes, setDetailNotes] = useState("");

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
          data?: OpenHouseData;
        };
        if (!res.ok || json.error) {
          const msg =
            (typeof json.error === "object" && json.error?.message) ||
            (res.status === 404 ? "Open house not found" : `Request failed (${res.status})`);
          setError(msg);
          setData(null);
          return;
        }
        setData(json.data ?? null);
        if (!json.data) {
          setError("Open house not found");
        }
      })
      .catch(() => {
        setError("Failed to load open house");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [openHouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const serverScheduleId = data?.id;
  const serverStartAt = data?.startAt;
  const serverEndAt = data?.endAt;
  const serverNotes = data?.notes;
  useEffect(() => {
    if (!serverScheduleId || !serverStartAt || !serverEndAt) return;
    setDetailStartDate(isoToDateInput(serverStartAt));
    setDetailStartTime(isoToTimeInput(serverStartAt));
    setDetailEndDate(isoToDateInput(serverEndAt));
    setDetailEndTime(isoToTimeInput(serverEndAt));
    setDetailNotes(serverNotes ?? "");
  }, [serverScheduleId, serverStartAt, serverEndAt, serverNotes]);

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

  const prepWorkspaceInput = useMemo(() => {
    if (!data) return null;
    return {
      flyerUrl: data.flyerUrl,
      flyerOverrideUrl: data.flyerOverrideUrl,
      propertyFlyerUrl: data.property?.flyerUrl,
      qrSlug: data.qrSlug,
      notes: data.notes,
      hostNotes: data.hostNotes,
      hostAgentId: data.hostAgentId,
      nonListingHostCount: data.hosts?.length ?? 0,
      prepChecklistFlags: data.prepChecklistFlags ?? null,
    };
  }, [data]);

  const prepProgress = useMemo(() => {
    if (!prepWorkspaceInput) return { done: 0, total: 0 };
    const items = buildOpenHousePrepChecklist(prepWorkspaceInput);
    const done = items.filter((i) => i.complete).length;
    return { done, total: items.length };
  }, [prepWorkspaceInput]);

  const scheduleDirty = useMemo(() => {
    if (!data) return false;
    return (
      detailStartDate !== isoToDateInput(data.startAt) ||
      detailStartTime !== isoToTimeInput(data.startAt) ||
      detailEndDate !== isoToDateInput(data.endAt) ||
      detailEndTime !== isoToTimeInput(data.endAt) ||
      (detailNotes.trim() || "") !== (data.notes?.trim() || "")
    );
  }, [data, detailStartDate, detailStartTime, detailEndDate, detailEndTime, detailNotes]);

  const saveEventDetails = useCallback(async () => {
    if (!openHouseId || !data) return;
    setDetailSaving(true);
    setError(null);
    try {
      const startAt = combineDateTimeLocal(detailStartDate, detailStartTime);
      const endAt = combineDateTimeLocal(detailEndDate, detailEndTime);
      if (endAt <= startAt) {
        setError("End time must be after start time.");
        return;
      }
      const res = await fetch(`/api/v1/open-houses/${openHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          notes: detailNotes.trim() ? detailNotes : null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDetailSaving(false);
    }
  }, [
    openHouseId,
    data,
    detailStartDate,
    detailStartTime,
    detailEndDate,
    detailEndTime,
    detailNotes,
    loadData,
  ]);

  if (loading && !data) return <PageLoading message="Loading open house..." />;
  if (!data) {
    return (
      <ErrorMessage
        message={error ?? "Open house not found"}
        onRetry={loadData}
      />
    );
  }

  const contextLine = [
    address || null,
    `${formatDateTime(data.startAt)} – ${formatDateTime(data.endAt)}`,
    openHouseStatusLabel(data.status),
  ]
    .filter(Boolean)
    .join(" · ");

  const openDetails = () => setTab("details");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
            asChild
          >
            <Link href="/showing-hq">
              <ArrowLeft className="h-4 w-4" />
              ShowingHQ
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <div>
            <h1 className="text-xl font-bold text-kp-on-surface">
              Open house — {data.title}
            </h1>
            <p className="text-sm text-kp-on-surface-variant">{contextLine}</p>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/80">
              Workspace — same tabs as private showings; Details holds schedule, status, QR, and visitor
              lists.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      <ShowingHqWorkflowTabStrip tab={tab} onTabChange={setTab} />

      <div className="flex flex-col gap-2 rounded-lg border border-kp-outline/70 bg-kp-surface-high/15 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-[11px] text-kp-on-surface-variant">
          {totalVisitors} visitor{totalVisitors !== 1 ? "s" : ""} ·{" "}
          {prepProgress.total > 0
            ? `Prep ${prepProgress.done}/${prepProgress.total}`
            : "Prep"}{" "}
          {data.qrSlug ? "· Sign-in live" : ""}
        </p>
        <div
          id={OPEN_HOUSE_INVITE_HOST_PRIMARY_ANCHOR_ID}
          className="flex flex-wrap gap-2 scroll-mt-28"
        >
          <InviteHostDialog openHouseId={openHouseId} onInviteSent={loadData} />
          <OpenHouseFlyerUploadButton
            openHouseId={openHouseId}
            size="sm"
            onUploaded={() => {
              setError(null);
              loadData();
            }}
            onError={(m) => setError(m)}
          />
          <Button size="sm" variant="outline" className={cn(kpBtnPrimary, "h-8 border-transparent text-xs")} asChild>
            <Link href={`/open-houses/${openHouseId}/sign-in`}>
              <QrCode className="mr-1.5 h-3.5 w-3.5" />
              Open sign-in
            </Link>
          </Button>
        </div>
      </div>

      {tab === "prep" && prepWorkspaceInput ? (
        <OpenHousePrepWorkspace
          openHouseId={openHouseId}
          input={prepWorkspaceInput}
          onReload={loadData}
          onOpenDetailsTab={openDetails}
          onFlyerUploadError={(m) => setError(m)}
        />
      ) : null}

      {tab === "feedback" && (
        <div className="space-y-4">
          <p className="text-xs text-kp-on-surface-variant">
            After the event, run reports and follow-ups from here — still inside this open house workspace.
          </p>
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="text-sm font-semibold text-kp-on-surface">Post-event outputs</p>
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            Seller report and visitor follow-ups for this open house.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className={cn(kpBtnPrimary, "h-8 border-transparent text-xs")}
              asChild
            >
              <Link href={`/open-houses/${openHouseId}/report`}>
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Seller report
              </Link>
            </Button>
            <Button size="sm" variant="outline" className={cn(kpBtnSecondary, "h-8 text-xs")} asChild>
              <Link href={`/open-houses/${openHouseId}/follow-ups`}>Visitor follow-ups</Link>
            </Button>
          </div>
        </div>
        </div>
      )}

      {tab === "details" && (
        <div className="space-y-6">
          <p className="text-xs text-kp-on-surface-variant">
            Event status, schedule, and field notes — save when you&apos;re done with changes on this tab.
            QR, visitors, and follow-ups are below.
          </p>

          <div className="space-y-3 rounded-xl border border-kp-outline/80 bg-kp-surface-high/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              Event status
            </p>
            <Select value={data.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
              <SelectTrigger className="h-9 max-w-xs border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="border-kp-outline bg-kp-surface">
                <SelectItem value="SCHEDULED" className="text-kp-on-surface">Scheduled</SelectItem>
                <SelectItem value="ACTIVE" className="text-kp-on-surface">Active</SelectItem>
                <SelectItem value="COMPLETED" className="text-kp-on-surface">Completed</SelectItem>
                <SelectItem value="CANCELLED" className="text-kp-on-surface">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-xl border border-kp-outline/80 bg-kp-surface-high/25 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
              Schedule & notes
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-kp-on-surface">Start date</Label>
                <Input
                  type="date"
                  value={detailStartDate}
                  onChange={(e) => setDetailStartDate(e.target.value)}
                  className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-kp-on-surface">Start time</Label>
                <Input
                  type="time"
                  value={detailStartTime}
                  onChange={(e) => setDetailStartTime(e.target.value)}
                  className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-kp-on-surface">End date</Label>
                <Input
                  type="date"
                  value={detailEndDate}
                  onChange={(e) => setDetailEndDate(e.target.value)}
                  className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-kp-on-surface">End time</Label>
                <Input
                  type="time"
                  value={detailEndTime}
                  onChange={(e) => setDetailEndTime(e.target.value)}
                  className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-kp-on-surface">Notes for team / host</Label>
              <textarea
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
                placeholder="Parking, access, staging notes…"
              />
            </div>
          </div>

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

          <div
            className={cn(
              "sticky bottom-4 z-10 flex justify-end rounded-lg border border-kp-outline/70 bg-kp-surface/95 px-3 py-2 shadow-lg backdrop-blur-sm"
            )}
          >
            <Button
              type="button"
              size="sm"
              className={cn(kpBtnPrimary, "h-9 border-transparent text-xs font-semibold")}
              disabled={!scheduleDirty || detailSaving}
              onClick={() => void saveEventDetails()}
            >
              {detailSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
