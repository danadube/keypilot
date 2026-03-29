"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
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
  Pencil,
} from "lucide-react";
import {
  OpenHousePrepWorkspace,
  OPEN_HOUSE_INVITE_HOST_PRIMARY_ANCHOR_ID,
} from "@/components/showing-hq/open-house-prep-workspace";
import { OpenHouseFlyerUploadButton } from "@/components/showing-hq/OpenHouseFlyerUploadButton";
import { HostFeedbackForm } from "@/components/open-houses/HostFeedbackForm";
import { OpenHouseVisitorRowInline } from "@/components/showing-hq/open-house-visitor-row-inline";
import { AgentFollowUpTaskCard } from "@/components/follow-ups/agent-follow-up-task-card";
import { ShowingHqWorkflowTabStrip } from "@/components/showing-hq/ShowingHqWorkflowTabStrip";
import {
  normalizeShowingHqWorkflowTab,
  openHouseWorkflowTabHref,
  type ShowingHqWorkflowTab,
} from "@/lib/showing-hq/showing-workflow-hrefs";
import { buildOpenHousePrepChecklist } from "@/lib/showing-hq/prep-checklist";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EditableBlock,
  EditableBlockHeader,
  EditableBlockContent,
  EditableBlockTableEditHeading,
} from "@/components/ui/editable-block";

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
  taskFollowUps?: {
    id: string;
    contactId: string;
    sourceType: string;
    sourceId: string;
    status: string;
    priority: string;
    title: string;
    notes: string | null;
    dueAt: string;
    completedAt: string | null;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }[];
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

function dateToDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateToTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTimeLocal(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

type PropertyOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

const STATUS_QUICK = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ACTIVE", label: "Live" },
  { value: "COMPLETED", label: "Complete" },
] as const;

function openHouseStatusLabel(status: string) {
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ACTIVE") return "Live";
  if (status === "COMPLETED") return "Complete";
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
  const [detailTitle, setDetailTitle] = useState("");
  const [detailPropertyId, setDetailPropertyId] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);

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

  useEffect(() => {
    if (!data?.id) return;
    setDetailTitle(data.title ?? "");
    setDetailPropertyId(data.property?.id ?? "");
  }, [data?.id, data?.title, data?.property?.id]);

  useEffect(() => {
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.data && Array.isArray(json.data)) {
          setProperties(
            json.data.map((p: { id: string; address1: string; city: string; state: string }) => ({
              id: p.id,
              address1: p.address1,
              city: p.city,
              state: p.state,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

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
  const draftTotal =
    (data?.draftStatusCounts?.DRAFT ?? 0) +
    (data?.draftStatusCounts?.REVIEWED ?? 0) +
    (data?.draftStatusCounts?.SENT_MANUAL ?? 0) +
    (data?.draftStatusCounts?.ARCHIVED ?? 0);
  const openTaskFollowUps =
    data?.taskFollowUps?.filter((t) => t.status !== "CLOSED").length ?? 0;
  const followUpsCount = draftTotal + openTaskFollowUps;

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
    const propId = data.property?.id ?? "";
    return (
      (detailTitle.trim() || "") !== (data.title?.trim() || "") ||
      detailPropertyId !== propId ||
      detailStartDate !== isoToDateInput(data.startAt) ||
      detailStartTime !== isoToTimeInput(data.startAt) ||
      detailEndDate !== isoToDateInput(data.endAt) ||
      detailEndTime !== isoToTimeInput(data.endAt) ||
      (detailNotes.trim() || "") !== (data.notes?.trim() || "")
    );
  }, [
    data,
    detailTitle,
    detailPropertyId,
    detailStartDate,
    detailStartTime,
    detailEndDate,
    detailEndTime,
    detailNotes,
  ]);

  const bumpStartMinutes = (deltaMinutes: number) => {
    const base = combineDateTimeLocal(detailStartDate, detailStartTime);
    if (Number.isNaN(base.getTime())) return;
    base.setMinutes(base.getMinutes() + deltaMinutes);
    setDetailStartDate(dateToDateInput(base));
    setDetailStartTime(dateToTimeInput(base));
  };

  const setStartNow = () => {
    const n = new Date();
    setDetailStartDate(dateToDateInput(n));
    setDetailStartTime(dateToTimeInput(n));
  };

  const alignEndHoursAfterStart = (hours: number) => {
    const start = combineDateTimeLocal(detailStartDate, detailStartTime);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    setDetailEndDate(dateToDateInput(end));
    setDetailEndTime(dateToTimeInput(end));
  };

  const saveEventDetails = useCallback(async () => {
    if (!openHouseId || !data) return;
    setDetailSaving(true);
    setError(null);
    try {
      if (!detailPropertyId?.trim()) {
        setError("Property is required.");
        return;
      }
      if (!detailTitle.trim()) {
        setError("Event title is required.");
        return;
      }
      const startAt = combineDateTimeLocal(detailStartDate, detailStartTime);
      const endAt = combineDateTimeLocal(detailEndDate, detailEndTime);
      if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
        setError("Invalid date or time.");
        return;
      }
      if (endAt <= startAt) {
        setError("End time must be after start time.");
        return;
      }
      const res = await fetch(`/api/v1/open-houses/${openHouseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: detailTitle.trim(),
          propertyId: detailPropertyId.trim(),
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
    detailTitle,
    detailPropertyId,
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
        <div className="flex min-w-0 flex-wrap items-center gap-3">
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
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-kp-on-surface">
              Open house — {data.title}
            </h1>
            <p className="text-sm text-kp-on-surface-variant">{contextLine}</p>
            <p className="mt-0.5 text-[11px] text-kp-on-surface-variant/80">
              Property, title, schedule, visitors, and host debrief are editable on this page.{" "}
              <span className="font-medium text-kp-teal/90">Details</span> tab saves event fields;{" "}
              <span className="font-medium text-kp-teal/90">Feedback</span> for host debrief.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(kpBtnSecondary, "h-8 shrink-0 gap-1.5 text-xs font-semibold")}
          onClick={() => setTab("details")}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Edit details
        </Button>
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
              Host console
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
            Host debrief (traffic, tags, notes) and post-event outputs — all from this workspace.
          </p>
          <EditableBlock
            variant="inline"
            className="border-kp-outline/80 bg-kp-surface-high/20 p-5"
          >
            <EditableBlockHeader
              titleTone="default"
              title="Host debrief"
              description="Correct or clear post-event feedback without opening the host console."
            />
            <EditableBlockContent className="space-y-0">
              <HostFeedbackForm
                openHouseId={openHouseId}
                initialData={{
                  trafficLevel: data.trafficLevel,
                  feedbackTags: data.feedbackTags,
                  hostNotes: data.hostNotes,
                }}
                isHostAgent={false}
                workspaceOwnerEdit
                onSave={() => loadData()}
              />
            </EditableBlockContent>
          </EditableBlock>
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

          <EditableBlock variant="inline">
            <EditableBlockHeader
              title="Event status"
              description="Tap a status to update now — no save bar required."
            />
            <EditableBlockContent>
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_QUICK.map((s, i) => (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={updatingStatus}
                    className={cn(
                      "h-9 min-w-[100px] text-xs font-semibold",
                      data.status === s.value
                        ? cn(kpBtnPrimary, "border-transparent")
                        : kpBtnSecondary
                    )}
                    onClick={() => handleStatusChange(s.value)}
                    {...(i === 0 ? { "data-editable-focus": true as const } : {})}
                  >
                    {s.label}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updatingStatus}
                  className={cn(
                    "h-9 text-xs",
                    data.status === "CANCELLED" ? kpBtnPrimary : kpBtnTertiary
                  )}
                  onClick={() => handleStatusChange("CANCELLED")}
                >
                  Cancelled
                </Button>
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock variant="inline">
            <EditableBlockHeader
              title="Property & title"
              description="Listing and how this event appears in ShowingHQ."
            />
            <EditableBlockContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-kp-on-surface">Property</Label>
                  <Select value={detailPropertyId} onValueChange={setDetailPropertyId}>
                    <SelectTrigger
                      className="h-10 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                      data-editable-focus
                    >
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 border-kp-outline bg-kp-surface">
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-kp-on-surface">
                          {p.address1}, {p.city}, {p.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-kp-on-surface">Event title</Label>
                  <Input
                    value={detailTitle}
                    onChange={(e) => setDetailTitle(e.target.value)}
                    className="h-10 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                    placeholder="Open house title"
                  />
                </div>
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock variant="inline">
            <EditableBlockHeader
              title="Schedule"
              description="Start and end — quick actions adjust start or align end from start."
            />
            <EditableBlockContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-kp-on-surface">Start date</Label>
                  <Input
                    type="date"
                    value={detailStartDate}
                    onChange={(e) => setDetailStartDate(e.target.value)}
                    className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                    data-editable-focus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-kp-on-surface">Start time</Label>
                  <Input
                    type="time"
                    step={60}
                    value={detailStartTime}
                    onChange={(e) => setDetailStartTime(e.target.value)}
                    className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface tabular-nums"
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
                    step={60}
                    value={detailEndTime}
                    onChange={(e) => setDetailEndTime(e.target.value)}
                    className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface tabular-nums"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
                  onClick={setStartNow}
                >
                  Start: Now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
                  onClick={() => bumpStartMinutes(30)}
                >
                  Start +30m
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
                  onClick={() => bumpStartMinutes(60)}
                >
                  Start +1h
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
                  onClick={() => alignEndHoursAfterStart(2)}
                >
                  End +2h from start
                </Button>
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock variant="inline">
            <EditableBlockHeader
              title="Notes"
              description="For team / host — saved with the rest of the event via Save changes."
            />
            <EditableBlockContent>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-kp-on-surface-variant">
                  Notes for team / host
                </Label>
                <textarea
                  value={detailNotes}
                  onChange={(e) => setDetailNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-kp-outline/80 bg-kp-surface-high/80 px-3 py-2 text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant/70"
                  placeholder="Parking, access, staging notes…"
                  data-editable-focus
                />
              </div>
            </EditableBlockContent>
          </EditableBlock>

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
        <EditableBlock variant="table">
          <EditableBlockHeader
            titleTone="default"
            title="Visitors"
            description={
              data.visitors.length === 0
                ? "Sign-ins appear here after visitors use your link."
                : `${data.visitors.length} sign-in${data.visitors.length !== 1 ? "s" : ""} — use Edit on each row.`
            }
          />
          <EditableBlockContent className="space-y-0">
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
                      <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Phone</th>
                      <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Interest</th>
                      <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Sign-in</th>
                      <th className="pb-2 text-left text-xs font-semibold text-kp-on-surface-variant">Status</th>
                      <th className="pb-2 w-[180px] text-right text-xs font-semibold text-kp-on-surface-variant">
                        <EditableBlockTableEditHeading className="w-full justify-end" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kp-outline">
                    {data.visitors.map((v, i) => (
                      <OpenHouseVisitorRowInline
                        key={v.id}
                        v={v}
                        formatDateTime={formatDateTime}
                        onRefresh={loadData}
                        anchorEditFocus={i === 0}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EditableBlockContent>
        </EditableBlock>

        {/* Follow-ups */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <p className="mb-1 text-sm font-semibold text-kp-on-surface">Follow-ups</p>
          <p className="mb-4 text-xs text-kp-on-surface-variant">
            Person tasks are global; here you see only this open house. Same entries appear on{" "}
            <Link href="/showing-hq" className="text-kp-teal hover:underline">
              ShowingHQ
            </Link>
            . Email drafts and bulk tools:{" "}
            <Link href={`/open-houses/${openHouseId}/follow-ups`} className="text-kp-teal hover:underline">
              manage follow-ups
            </Link>
            .
          </p>
          {(() => {
            const allTasks = data.taskFollowUps ?? [];
            const activeFollowUps = allTasks.filter((t) => t.status !== "CLOSED");
            const doneFollowUps = allTasks.filter((t) => t.status === "CLOSED");
            const noTasks = allTasks.length === 0;
            const noDrafts = data.drafts.length === 0;

            if (noTasks && noDrafts) {
              return (
                <div className="rounded-lg border border-dashed border-kp-outline/80 bg-kp-surface-high/20 px-3 py-5 text-center">
                  <p className="text-sm font-medium text-kp-on-surface">No follow-ups for this event yet</p>
                  <p className="mt-2 text-xs text-kp-on-surface-variant">
                    {data.visitors.length > 0
                      ? "Use Follow-up on a visitor row to add a dated task. It will show here and on your ShowingHQ home."
                      : "After visitors sign in, add person follow-ups from each row — or open ShowingHQ to work the global list."}
                  </p>
                </div>
              );
            }

            return (
              <ul className="space-y-3">
                {activeFollowUps.length > 0 ? (
                  <li className="list-none space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Open tasks ({activeFollowUps.length})
                    </p>
                    {activeFollowUps.map((t) => (
                      <AgentFollowUpTaskCard
                        key={t.id}
                        task={t}
                        accent="neutral"
                        onUpdated={loadData}
                      />
                    ))}
                  </li>
                ) : null}
                {doneFollowUps.length > 0 ? (
                  <li className="list-none space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Completed ({doneFollowUps.length})
                    </p>
                    {doneFollowUps.map((t) => (
                      <AgentFollowUpTaskCard key={t.id} task={t} accent="done" onUpdated={loadData} />
                    ))}
                  </li>
                ) : null}
                {data.drafts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-kp-outline bg-kp-surface-high p-3"
                >
                  <div>
                    <p className="font-medium text-kp-on-surface">{d.subject}</p>
                    <p className="text-[11px] text-kp-on-surface-variant">Email draft</p>
                  </div>
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
            );
          })()}
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
                  Host console
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
