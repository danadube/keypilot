"use client";

import { useEffect, useState } from "react";
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
import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { BrandCard } from "@/components/ui/BrandCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar YYYY-MM-DD */
function toDatePart(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local time HH:mm for `<input type="time" />` */
function toTimePart(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function combineLocalDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function defaultScheduleParts(): { date: string; time: string } {
  const d = new Date();
  return { date: toDatePart(d), time: toTimePart(d) };
}

export function NewShowingForm() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [buyerAgentName, setBuyerAgentName] = useState("");
  const [buyerAgentEmail, setBuyerAgentEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [notes, setNotes] = useState("");
  const [feedbackRequired, setFeedbackRequired] = useState(false);

  useEffect(() => {
    const { date, time } = defaultScheduleParts();
    setScheduleDate(date);
    setScheduleTime(time);
  }, []);

  useEffect(() => {
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperties(json.data || []);
      })
      .catch(() => setError("Failed to load properties"))
      .finally(() => setLoading(false));
  }, []);

  const applyFromDate = (d: Date) => {
    setScheduleDate(toDatePart(d));
    setScheduleTime(toTimePart(d));
  };

  const baseDateForOffset = (): Date => {
    if (scheduleDate && scheduleTime) {
      const parsed = combineLocalDateAndTime(scheduleDate, scheduleTime);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  const setNow = () => applyFromDate(new Date());

  const addMinutes = (minutes: number) => {
    const b = baseDateForOffset();
    applyFromDate(new Date(b.getTime() + minutes * 60_000));
  };

  const setTomorrowTenAm = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    applyFromDate(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId?.trim()) {
      setError("Property is required.");
      return;
    }
    if (!scheduleDate?.trim() || !scheduleTime?.trim()) {
      setError("Date and time are required.");
      return;
    }
    const scheduled = combineLocalDateAndTime(scheduleDate.trim(), scheduleTime.trim());
    if (Number.isNaN(scheduled.getTime())) {
      setError("Invalid date or time.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/showing-hq/showings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: propertyId.trim(),
          scheduledAt: scheduled.toISOString(),
          buyerAgentName: buyerAgentName.trim() || null,
          buyerAgentEmail: buyerAgentEmail.trim() || null,
          buyerName: buyerName.trim() || null,
          notes: notes.trim() || null,
          feedbackRequired,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const id = json.data?.id as string | undefined;
      if (id) {
        router.push(`/showing-hq?newShowing=${encodeURIComponent(id)}`);
      } else {
        router.push("/showing-hq");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create showing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading message="Loading properties..." />;
  if (error && properties.length === 0) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      <ShowingHQPageHero
        title="Schedule Showing"
        description="Schedule a showing for a buyer or agent. This will appear in ShowingHQ → Today."
        action={
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
            <Link href="/showing-hq/showings">← Back</Link>
          </Button>
        }
      />

      <BrandCard elevated padded className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="propertyId">Property *</Label>
            <Select value={propertyId} onValueChange={setPropertyId} required>
              <SelectTrigger id="propertyId" className="h-11">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Date *</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleTime">Time *</Label>
              <Input
                id="scheduleTime"
                type="time"
                step={60}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                required
                className="h-11 font-medium tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
              onClick={setNow}
            >
              Now
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
              onClick={() => addMinutes(30)}
            >
              +30 min
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
              onClick={() => addMinutes(60)}
            >
              +1 hour
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "h-8 text-[11px] font-semibold")}
              onClick={setTomorrowTenAm}
            >
              Tomorrow 10:00 AM
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buyerAgentName">Buyer agent name</Label>
            <Input
              id="buyerAgentName"
              value={buyerAgentName}
              onChange={(e) => setBuyerAgentName(e.target.value)}
              placeholder="Agent name"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerAgentEmail">Buyer agent email</Label>
            <Input
              id="buyerAgentEmail"
              type="email"
              value={buyerAgentEmail}
              onChange={(e) => setBuyerAgentEmail(e.target.value)}
              placeholder="agent@example.com"
              className="h-10"
            />
          </div>

          <div className="space-y-2 border-t border-kp-outline/40 pt-4">
            <Label htmlFor="buyerName" className="text-xs font-medium text-kp-on-surface-variant">
              Buyer name <span className="font-normal">(optional)</span>
            </Label>
            <Input
              id="buyerName"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="Buyer name"
              className="h-9 bg-kp-surface/40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-medium text-kp-on-surface-variant">
              Notes <span className="font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context for you — not required to schedule"
              rows={2}
              className="min-h-[72px] resize-y bg-kp-surface/40 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="feedbackRequired"
              checked={feedbackRequired}
              onChange={(e) => setFeedbackRequired(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="feedbackRequired" className="cursor-pointer text-sm font-normal">
              Feedback required <span className="text-kp-on-surface-variant">(request after showing)</span>
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="outline"
              disabled={submitting}
              className={cn(kpBtnPrimary, "border-transparent")}
            >
              {submitting ? "Scheduling…" : "Schedule Showing"}
            </Button>
            <Button variant="outline" type="button" className={cn(kpBtnSecondary)} asChild>
              <Link href="/showing-hq/showings">Cancel</Link>
            </Button>
          </div>
        </form>
      </BrandCard>
    </div>
  );
}
