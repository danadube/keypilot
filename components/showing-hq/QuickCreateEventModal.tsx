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
import { kpCalendarModalField } from "@/components/showing-hq/calendar-modal-field-classes";
import { cn } from "@/lib/utils";
import { TimeQuickChips } from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  localDateTimeFromParts,
} from "@/lib/datetime/local-scheduling";

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

    const startAt = localDateTimeFromParts(dateStr, startTimeStr);
    if (Number.isNaN(startAt.getTime())) {
      setError("Invalid date or start time.");
      return;
    }

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
        const endAt = localDateTimeFromParts(dateStr, endTimeStr || "11:00");
        if (Number.isNaN(endAt.getTime())) {
          setError("Invalid end time.");
          setSubmitting(false);
          return;
        }
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
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={kpCalendarModalField.buttonCancel}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quick-create-form"
            variant="outline"
            disabled={!canSave || submitting}
            className={kpCalendarModalField.buttonSave}
          >
            {submitting ? "Saving…" : "Save event"}
          </Button>
        </div>
      }
    >
      <form id="quick-create-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <p className={kpCalendarModalField.error} role="alert">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label className={kpCalendarModalField.label}>Event type</Label>
          <Select
            value={eventType}
            onValueChange={(v) => setEventType(v as QuickCreateEventType)}
          >
            <SelectTrigger className={kpCalendarModalField.selectTrigger}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={kpCalendarModalField.selectContent}>
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={!opt.enabled}
                  className={kpCalendarModalField.selectItem}
                >
                  {opt.label}
                  {!opt.enabled ? " (coming soon)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className={kpCalendarModalField.label}>Property</Label>
          {loading ? (
            <p className={kpCalendarModalField.mutedHelp}>Loading properties…</p>
          ) : (
            <Select
              value={propertyId}
              onValueChange={setPropertyId}
              disabled={!typeOpt?.enabled}
            >
              <SelectTrigger className={kpCalendarModalField.selectTrigger}>
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent className={kpCalendarModalField.selectContent}>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id} className={kpCalendarModalField.selectItem}>
                    {p.address1}, {p.city}, {p.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div
          className={cn(
            kpCalendarModalField.scheduleChrome,
            "kp-calendar-modal-datetime space-y-3"
          )}
        >
          <p className={kpCalendarModalField.scheduleTitle}>Date & time</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={kpCalendarModalField.label}>Date</Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                disabled={!typeOpt?.enabled}
                className={kpCalendarModalField.inputNativePicker}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={kpCalendarModalField.label}>Start time</Label>
              <Input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                disabled={!typeOpt?.enabled}
                className={kpCalendarModalField.inputNativePicker}
              />
            </div>
          </div>
          <TimeQuickChips
            className="pt-1"
            disabled={!typeOpt?.enabled}
            onSelect={(p) => {
              const next = applyQuickTimePreset(p, { date: dateStr, time: startTimeStr });
              setDateStr(next.date);
              setStartTimeStr(next.time);
            }}
          />
          {eventType === "open_house" && (
            <div className="space-y-1.5 sm:max-w-[calc(50%-0.375rem)]">
              <Label className={kpCalendarModalField.label}>End time</Label>
              <Input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className={kpCalendarModalField.inputNativePicker}
              />
            </div>
          )}
        </div>
      </form>
    </BrandModal>
  );
}
