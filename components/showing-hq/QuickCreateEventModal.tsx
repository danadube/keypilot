"use client";

import { useEffect, useState } from "react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

export type QuickCreateEventType = "showing" | "open_house" | "listing_appointment" | "inspection" | "offer_deadline";

const EVENT_TYPE_OPTIONS: { value: QuickCreateEventType; label: string; enabled: boolean }[] = [
  { value: "showing", label: "Create Showing", enabled: true },
  { value: "open_house", label: "Create Open House", enabled: true },
  { value: "listing_appointment", label: "Create Listing Appointment", enabled: false },
  { value: "inspection", label: "Create Inspection", enabled: false },
  { value: "offer_deadline", label: "Create Offer Deadline", enabled: false },
];

type QuickCreateEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial date when opened from calendar day click (YYYY-MM-DD) */
  initialDateStr: string | null;
  onSaved: () => void;
};

export function QuickCreateEventModal({
  open,
  onOpenChange,
  initialDateStr,
  onSaved,
}: QuickCreateEventModalProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eventType, setEventType] = useState<QuickCreateEventType>("showing");
  const [propertyId, setPropertyId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTimeStr, setStartTimeStr] = useState("10:00");
  const [endTimeStr, setEndTimeStr] = useState("11:00");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperties(json.data || []);
      })
      .catch(() => setError("Failed to load properties"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialDateStr) {
      setDateStr(initialDateStr);
    } else {
      const d = new Date();
      setDateStr(
        [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-")
      );
    }
  }, [open, initialDateStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const typeOpt = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
    if (!typeOpt?.enabled) return;
    if (!propertyId?.trim() || !dateStr?.trim() || !startTimeStr?.trim()) {
      setError("Property, date, and start time are required.");
      return;
    }

    const [sh, sm] = startTimeStr.split(":").map(Number);
    const startAt = new Date(dateStr);
    startAt.setHours(sh, sm ?? 0, 0, 0);

    setSubmitting(true);
    setError(null);
    try {
      if (eventType === "showing") {
        const res = await fetch("/api/v1/showing-hq/showings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: propertyId.trim(),
            scheduledAt: startAt.toISOString(),
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
      } else if (eventType === "open_house") {
        const [eh, em] = (endTimeStr || "11:00").split(":").map(Number);
        const endAt = new Date(dateStr);
        endAt.setHours(eh, em ?? 0, 0, 0);
        if (endAt <= startAt) {
          setError("End time must be after start time.");
          setSubmitting(false);
          return;
        }
        const prop = properties.find((p) => p.id === propertyId);
        const title = prop ? `Open House · ${prop.address1}` : "Open House";
        const res = await fetch("/api/v1/open-houses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: propertyId.trim(),
            title,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  const typeOpt = EVENT_TYPE_OPTIONS.find((o) => o.value === eventType);
  const canSave = typeOpt?.enabled && propertyId && dateStr && startTimeStr;

  return (
    <BrandModal
      open={open}
      onOpenChange={onOpenChange}
      title="Quick create event"
      description="Choose event type, property, and time."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="quick-create-form" disabled={!canSave || submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <form id="quick-create-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-2">
          <Label>Event type</Label>
          <Select
            value={eventType}
            onValueChange={(v) => setEventType(v as QuickCreateEventType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={!opt.enabled}
                >
                  {opt.label}
                  {!opt.enabled ? " (coming soon)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Property</Label>
          {loading ? (
            <p className="text-sm text-slate-500">Loading properties…</p>
          ) : (
            <Select
              value={propertyId}
              onValueChange={setPropertyId}
              disabled={!typeOpt?.enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address1}, {p.city}, {p.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              disabled={!typeOpt?.enabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input
              type="time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              disabled={!typeOpt?.enabled}
            />
          </div>
        </div>

        {eventType === "open_house" && (
          <div className="space-y-2">
            <Label>End time</Label>
            <Input
              type="time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
            />
          </div>
        )}
      </form>
    </BrandModal>
  );
}
