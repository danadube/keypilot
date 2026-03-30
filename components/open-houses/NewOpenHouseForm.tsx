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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    ]).then(([propsJson, agentsJson]) => {
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
    }).catch(() => setError("Failed to load")).finally(() => setLoading(false));
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
    const name = agentSource === "me" ? (agents.find((a) => a.id === "me")?.name ?? agentName) : agentName;
    const email = agentSource === "me" ? (agents.find((a) => a.id === "me")?.email ?? agentEmail) : agentEmail;
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
          agentEmail: email?.trim() || null,
          agentPhone: agentPhone?.trim() || null,
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
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
          <Link href="/open-houses">← Back</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No properties yet</CardTitle>
            <CardDescription>
              Add a property first before creating an open house.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className={cn(kpBtnPrimary, "border-transparent")} asChild>
              <Link href="/properties/new">Add Property</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Event details</CardTitle>
            <CardDescription>
              Schedule an open house for one of your properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="propertyId">Property *</Label>
                <Select
                  value={propertyId}
                  onValueChange={setPropertyId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
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

              {propertyId && (
                <div className="space-y-2">
                  <Label>Property photo</Label>
                  <div className="flex items-start gap-4">
                    {selectedProperty?.imageUrl ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedProperty.imageUrl}
                          alt="Property"
                          className="h-24 w-32 rounded-lg border object-cover"
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
                        {photoUploading ? "Uploading..." : (
                          <>
                            <ImagePlus className="mr-2 h-4 w-4" />
                            Upload photo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Event title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Open House"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hosting agent</Label>
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
                    <SelectItem value="custom">Enter custom</SelectItem>
                  </SelectContent>
                </Select>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="agentName">Agent name</Label>
                    <Input
                      id="agentName"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Jane Smith"
                      readOnly={agentSource === "me"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentEmail">Agent email</Label>
                    <Input
                      id="agentEmail"
                      type="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="jane@example.com"
                      readOnly={agentSource === "me"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agentPhone">Agent phone</Label>
                    <Input
                      id="agentPhone"
                      type="tel"
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-kp-on-surface-variant">Start *</p>
                <DateTimeFieldGroup>
                  <div className="space-y-1.5">
                    <Label htmlFor="ohStartDate" className="text-xs">
                      Date
                    </Label>
                    <DateInputField
                      id="ohStartDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ohStartTime" className="text-xs">
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
                <TimeQuickChips
                  onSelect={(p) => {
                    const next = applyQuickTimePreset(p, { date: startDate, time: startTime });
                    setStartDate(next.date);
                    setStartTime(next.time);
                  }}
                />
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
                  Set end +2h from start
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-kp-on-surface-variant">End *</p>
                <DateTimeFieldGroup>
                  <div className="space-y-1.5">
                    <Label htmlFor="ohEndDate" className="text-xs">
                      Date
                    </Label>
                    <DateInputField
                      id="ohEndDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ohEndTime" className="text-xs">
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

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this event"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={submitting}
                  className={cn(kpBtnPrimary, "border-transparent")}
                >
                  {submitting ? AF.creating : "Create Open House"}
                </Button>
                <Button type="button" variant="outline" className={cn(kpBtnSecondary)} asChild>
                  <Link href="/open-houses">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
