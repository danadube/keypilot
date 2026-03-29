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
import {
  DateInputField,
  TimeInputField,
  TimeQuickChips,
  DateTimeFieldGroup,
} from "@/components/ui/time-input";
import {
  applyQuickTimePreset,
  combineLocalDateAndTimeToIso,
} from "@/lib/datetime/local-scheduling";
import { AF, afError } from "@/lib/ui/action-feedback";
import { showingWorkflowTabHref } from "@/lib/showing-hq/showing-workflow-hrefs";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
};

export function NewShowingForm() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [buyerAgentName, setBuyerAgentName] = useState("");
  const [buyerAgentEmail, setBuyerAgentEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [notes, setNotes] = useState("");
  const [feedbackRequired, setFeedbackRequired] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledIso = combineLocalDateAndTimeToIso(scheduledDate, scheduledTime);
    if (!propertyId?.trim() || !scheduledIso) {
      setError("Property and a valid date and time are required.");
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
          scheduledAt: scheduledIso,
          buyerAgentName: buyerAgentName.trim() || null,
          buyerAgentEmail: buyerAgentEmail.trim() || null,
          buyerName: buyerName.trim() || null,
          notes: notes.trim() || null,
          feedbackRequired,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      // Navigate directly to the new showing's workspace — context is self-evident there.
      router.push(showingWorkflowTabHref(json.data.id, "prep"));
    } catch (err) {
      setError(afError(err, AF.couldntCreate));
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
        description="Create a single private showing (different from an open house)."
        action={
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
            <Link href="/showing-hq/showings">← Back</Link>
          </Button>
        }
      />

      <BrandCard elevated padded className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="propertyId">Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
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
            </div>
            <div className="space-y-2">
              <Label>Date & time *</Label>
              <DateTimeFieldGroup>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledDate" className="text-xs text-kp-on-surface-variant">
                    Date
                  </Label>
                  <DateInputField
                    id="scheduledDate"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledTime" className="text-xs text-kp-on-surface-variant">
                    Time
                  </Label>
                  <TimeInputField
                    id="scheduledTime"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </DateTimeFieldGroup>
              <TimeQuickChips
                className="pt-1"
                onSelect={(p) => {
                  const next = applyQuickTimePreset(p, {
                    date: scheduledDate,
                    time: scheduledTime,
                  });
                  setScheduledDate(next.date);
                  setScheduledTime(next.time);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerAgentName">Buyer Agent Name</Label>
              <Input
                id="buyerAgentName"
                value={buyerAgentName}
                onChange={(e) => setBuyerAgentName(e.target.value)}
                placeholder="Agent name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerAgentEmail">Buyer Agent Email</Label>
              <Input
                id="buyerAgentEmail"
                type="email"
                value={buyerAgentEmail}
                onChange={(e) => setBuyerAgentEmail(e.target.value)}
                placeholder="agent@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name (optional)</Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="feedbackRequired"
                checked={feedbackRequired}
                onChange={(e) => setFeedbackRequired(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="feedbackRequired" className="cursor-pointer">
                Feedback required (request after showing)
              </Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                variant="outline"
                disabled={submitting}
                className={cn(kpBtnPrimary, "border-transparent")}
              >
                {submitting ? AF.scheduling : "Create Showing"}
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
