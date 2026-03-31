"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EditableBlock,
  EditableBlockContent,
  EditableBlockHeader,
} from "@/components/ui/editable-block";
import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";
import { AF, afError, FLASH_QUERY } from "@/lib/ui/action-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ImagePlus } from "lucide-react";
import {
  DateInputField,
  TimeInputField,
  TimeQuickChips,
  DateTimeFieldGroup,
} from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  combineLocalDateAndTimeToIso,
  dateToLocalDateInput,
  dateToLocalTimeInput,
  localDateTimeFromParts,
} from "@/lib/datetime/local-scheduling";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  imageUrl?: string | null;
};

type Agent = {
  id: string;
  name: string;
  email: string;
};

export function NewOpenHouseForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [agentSource, setAgentSource] = useState<"me" | "custom">("me");
  const [agentName, setAgentName] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [agentPhone, setAgentPhone] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/properties").then((res) => res.json()),
      fetch("/api/v1/agents").then((res) => res.json()),
    ])
      .then(([propsJson, agentsJson]) => {
        if (propsJson.error) setError(propsJson.error.message);
        else setProperties(propsJson.data || []);
        if (!agentsJson.error) {
          const list = agentsJson.data || [];
          setAgents(list);
          const me = list.find((a: Agent) => a.id === "me");
          if (me) {
            setAgentName(me.name);
            setAgentEmail(me.email);
          }
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const selectedProperty = properties.find((p) => p.id === propertyId);

  const handleUseMe = () => {
    const me = agents.find((a) => a.id === "me");
    if (me) {
      setAgentName(me.name);
      setAgentEmail(me.email);
      setAgentPhone("");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/v1/properties/${propertyId}/photo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, imageUrl: json.data.imageUrl } : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = combineLocalDateAndTimeToIso(startDate, startTime);
    const endIso = combineLocalDateAndTimeToIso(endDate, endTime);
    if (!propertyId || !title || !startIso || !endIso) {
      setError("Please fill in all required fields with valid date and time.");
      return;
    }
    if (new Date(endIso) <= new Date(startIso)) {
      setError("End time must be after start time.");
      return;
    }
    const name =
      agentSource === "me"
        ? agents.find((a) => a.id === "me")?.name ?? agentName
        : agentName;
    const secondEmail =
      agentSource === "me"
        ? agents.find((a) => a.id === "me")?.email ?? agentEmail
        : agentEmail;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/open-houses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          title,
          startAt: startIso,
          endAt: endIso,
          notes: notes || null,
          agentName: name?.trim() || null,
          agentEmail: secondEmail?.trim() || null,
          agentPhone: agentPhone.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const href = showingHqOpenHouseWorkspaceHref(json.data.id);
      router.push(`${href}?flash=${FLASH_QUERY.openHouseCreated}`);
    } catch (err) {
      setError(afError(err, AF.couldntCreate));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading message="Loading properties..." />;

  if (error && properties.length === 0) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetch("/api/v1/properties")
            .then((res) => res.json())
            .then((json) => {
              if (json.error) setError(json.error.message);
              else setProperties(json.data || []);
            })
            .catch(() => setError("Failed to load properties"))
            .finally(() => setLoading(false));
        }}
      />
    );
  }

  return (
    <div className="min-h-0 flex flex-col gap-4 bg-transparent">
      <ShowingHQPageHero
        title="New Open House"
        description="Public event with visitor sign-in — not a private showing. This will appear in ShowingHQ once scheduled."
        action={
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
            <Link href="/open-houses" className="text-slate-200 hover:text-white">
              ← Back to open houses
            </Link>
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EditableBlock className="mx-auto w-full max-w-2xl !p-3.5 sm:!p-4">
          <EditableBlockHeader
            title="Add a property first"
            description="You need at least one property to schedule an open house."
            showEditButton={false}
          />
          <EditableBlockContent>
            <Button variant="outline" className={cn(kpBtnPrimary, "border-0")} asChild>
              <Link href="/properties/new">Add property</Link>
            </Button>
          </EditableBlockContent>
        </EditableBlock>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-8"
        >
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
            <EditableBlockHeader
              title="Event details"
              description="Property, listing title, and optional photo."
              showEditButton={false}
            />
            <EditableBlockContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="propertyId" className="text-xs text-kp-on-surface-variant">
                  Property <span className="text-destructive">*</span>
                </Label>
                <Select value={propertyId} onValueChange={setPropertyId} required>
                  <SelectTrigger id="propertyId">
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.address1}, {p.city}, {p.state} {p.zip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {propertyId ? (
                <div className="space-y-1">
                  <Label className="text-xs text-kp-on-surface-variant">Property photo</Label>
                  <div className="flex flex-wrap items-start gap-3">
                    {selectedProperty?.imageUrl ? (
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedProperty.imageUrl}
                          alt="Property preview"
                          className="h-20 w-28 rounded-lg border border-kp-outline object-cover"
                        />
                      </div>
                    ) : null}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(kpBtnSecondary)}
                        disabled={photoUploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {photoUploading ? (
                          "Uploading…"
                        ) : (
                          <>
                            <ImagePlus className="mr-2 h-4 w-4" />
                            Upload photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs text-kp-on-surface-variant">
                  Event title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday open house"
                  required
                />
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock
            className={cn(
              "space-y-2.5 !p-3.5 ring-1 ring-kp-teal/25 sm:!p-4",
              "bg-kp-teal/[0.06]"
            )}
          >
            <EditableBlockHeader
              title="Schedule"
              description="Start and end — quick presets apply to start time."
              showEditButton={false}
            />
            <EditableBlockContent className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                  Start <span className="text-destructive">*</span>
                </p>
                <DateTimeFieldGroup className="gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ohStartDate" className="text-[11px] text-kp-on-surface-variant">
                      Date
                    </Label>
                    <DateInputField
                      id="ohStartDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ohStartTime" className="text-[11px] text-kp-on-surface-variant">
                      Time
                    </Label>
                    <TimeInputField
                      id="ohStartTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </DateTimeFieldGroup>
                <div className="rounded-lg border border-kp-outline/90 bg-kp-surface-high/35 px-2.5 py-2 sm:px-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                    Quick set
                  </p>
                  <TimeQuickChips
                    emphasized
                    disabled={submitting}
                    className="gap-1.5 sm:gap-2"
                    onSelect={(p) => {
                      const next = applyQuickTimePreset(p, {
                        date: startDate,
                        time: startTime,
                      });
                      setStartDate(next.date);
                      setStartTime(next.time);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
                  onClick={() => {
                    const start = localDateTimeFromParts(startDate, startTime);
                    if (Number.isNaN(start.getTime())) return;
                    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
                    setEndDate(dateToLocalDateInput(end));
                    setEndTime(dateToLocalTimeInput(end));
                  }}
                >
                  Set end +2 hours from start
                </Button>
              </div>
              <div className="border-t border-kp-outline/50 pt-2.5">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                  End <span className="text-destructive">*</span>
                </p>
                <DateTimeFieldGroup className="gap-2 sm:gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ohEndDate" className="text-[11px] text-kp-on-surface-variant">
                      Date
                    </Label>
                    <DateInputField
                      id="ohEndDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ohEndTime" className="text-[11px] text-kp-on-surface-variant">
                      Time
                    </Label>
                    <TimeInputField
                      id="ohEndTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </DateTimeFieldGroup>
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
            <EditableBlockHeader
              title="Listing agent"
              description="Shown on the open house; defaults to you."
              showEditButton={false}
            />
            <EditableBlockContent className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-kp-on-surface-variant">Host</Label>
                <Select
                  value={agentSource}
                  onValueChange={(v: "me" | "custom") => {
                    setAgentSource(v);
                    if (v === "me") handleUseMe();
                    else {
                      setAgentName("");
                      setAgentEmail("");
                      setAgentPhone("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">
                      Me ({agents.find((a) => a.id === "me")?.name ?? "Current user"})
                    </SelectItem>
                    <SelectItem value="custom">Someone else</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="agentName" className="text-xs text-kp-on-surface-variant">
                    Name
                  </Label>
                  <Input
                    id="agentName"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Name"
                    readOnly={agentSource === "me"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agentEmail" className="text-xs text-kp-on-surface-variant">
                    Email
                  </Label>
                  <Input
                    id="agentEmail"
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    placeholder="Email"
                    readOnly={agentSource === "me"}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agentPhone" className="text-xs text-kp-on-surface-variant">
                    Phone
                  </Label>
                  <Input
                    id="agentPhone"
                    type="tel"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </EditableBlockContent>
          </EditableBlock>

          <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
            <EditableBlockHeader
              title="Notes"
              description="Optional — parking, access, co-host, etc."
              showEditButton={false}
            />
            <EditableBlockContent className="space-y-0">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add later from the workspace if you prefer."
                rows={2}
                className="min-h-[64px] resize-y text-sm text-kp-on-surface/90"
              />
            </EditableBlockContent>
          </EditableBlock>

          <div className="flex flex-col gap-2 border-t border-kp-outline/50 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="order-2 text-xs leading-snug text-kp-on-surface-variant sm:order-1 sm:max-w-md">
              This open house will appear in ShowingHQ and can be managed immediately.
            </p>
            <div className="order-1 flex flex-wrap gap-2 sm:order-2 sm:shrink-0">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className={cn(kpBtnPrimary, "min-w-[188px] border-0 shadow-md")}
              >
                {submitting ? AF.scheduling : "Schedule Open House"}
              </Button>
              <Button type="button" variant="outline" className={cn(kpBtnSecondary)} asChild>
                <Link href="/open-houses">Cancel</Link>
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
