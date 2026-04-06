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
import {
  EditableBlock,
  EditableBlockContent,
  EditableBlockHeader,
} from "@/components/ui/editable-block";
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
import { UI_COPY } from "@/lib/ui-copy";
import { toast } from "sonner";

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
      .catch(() => setError(UI_COPY.errors.load("properties")))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledIso = combineLocalDateAndTimeToIso(scheduledDate, scheduledTime);
    if (!propertyId?.trim() || !scheduledIso) {
      toast.error("Property and a valid date and time are required.");
      return;
    }
    setSubmitting(true);
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
      router.push(showingWorkflowTabHref(json.data.id, "prep"));
    } catch (err) {
      toast.error(afError(err, AF.couldntCreate));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading message="Loading properties..." />;
  if (error && properties.length === 0) {
    return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-0 flex flex-col gap-4 bg-transparent">
      <ShowingHQPageHero
        title="Schedule Showing"
        description="This will appear in ShowingHQ → Today. Private appointment only — not an open house."
        action={
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
            <Link
              href="/showing-hq/showings"
              className="text-kp-on-surface-variant hover:text-kp-on-surface"
            >
              ← Back to showings
            </Link>
          </Button>
        }
      />

      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-8"
      >
        <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
          <EditableBlockHeader
            title="Property & time"
            description="Where and when this showing runs."
            showEditButton={false}
          />
          <EditableBlockContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="propertyId" className="text-xs text-kp-on-surface-variant">
                Property <span className="text-destructive">*</span>
              </Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger id="propertyId" data-editable-focus>
                  <SelectValue placeholder="Choose a property" />
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
            <div className="space-y-1.5">
              <Label className="text-xs text-kp-on-surface-variant">
                Date & time <span className="text-destructive">*</span>
              </Label>
              <DateTimeFieldGroup className="gap-2 sm:gap-3">
                <div className="space-y-1">
                  <Label htmlFor="scheduledDate" className="text-[11px] text-kp-on-surface-variant">
                    Date
                  </Label>
                  <DateInputField
                    id="scheduledDate"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="scheduledTime" className="text-[11px] text-kp-on-surface-variant">
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
                      date: scheduledDate,
                      time: scheduledTime,
                    });
                    setScheduledDate(next.date);
                    setScheduledTime(next.time);
                  }}
                />
              </div>
            </div>
          </EditableBlockContent>
        </EditableBlock>

        <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
          <EditableBlockHeader title="Buyer agent" showEditButton={false} />
          <EditableBlockContent className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="buyerAgentName" className="text-xs text-kp-on-surface-variant">
                  Name
                </Label>
                <Input
                  id="buyerAgentName"
                  value={buyerAgentName}
                  onChange={(e) => setBuyerAgentName(e.target.value)}
                  placeholder="Agent name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="buyerAgentEmail" className="text-xs text-kp-on-surface-variant">
                  Email
                </Label>
                <Input
                  id="buyerAgentEmail"
                  type="email"
                  value={buyerAgentEmail}
                  onChange={(e) => setBuyerAgentEmail(e.target.value)}
                  placeholder="agent@example.com"
                />
              </div>
            </div>
          </EditableBlockContent>
        </EditableBlock>

        <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
          <EditableBlockHeader
            title="Optional details"
            description="Add now or later from the showing workspace."
            showEditButton={false}
          />
          <EditableBlockContent className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="buyerName" className="text-xs text-kp-on-surface-variant">
                Buyer name
              </Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs text-kp-on-surface-variant">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Access, lockbox, buyer preferences…"
                rows={2}
                className="min-h-[72px] resize-y text-sm"
              />
            </div>
          </EditableBlockContent>
        </EditableBlock>

        <EditableBlock className="space-y-2.5 !p-3.5 sm:!p-4">
          <EditableBlockHeader title="Feedback" showEditButton={false} />
          <EditableBlockContent className="space-y-0">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent py-0.5 hover:border-kp-outline/60">
              <input
                type="checkbox"
                id="feedbackRequired"
                checked={feedbackRequired}
                onChange={(e) => setFeedbackRequired(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-kp-outline"
              />
              <span className="min-w-0">
                <span className="text-sm font-medium text-kp-on-surface">
                  Request feedback after the showing
                </span>
                <span className="mt-0.5 block text-xs text-kp-on-surface-variant">
                  Sends a feedback request to the buyer agent when you are ready from the workspace.
                </span>
              </span>
            </label>
          </EditableBlockContent>
        </EditableBlock>

        <div className="flex flex-col gap-2 border-t border-kp-outline/50 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="order-2 text-xs leading-snug text-kp-on-surface-variant sm:order-1 sm:max-w-md">
            This showing will appear in Today and can be managed immediately.
          </p>
          <div className="order-1 flex flex-wrap gap-2 sm:order-2 sm:shrink-0">
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className={cn(kpBtnPrimary, "min-w-[168px] border-0 shadow-md")}
            >
              {submitting ? AF.scheduling : "Schedule Showing"}
            </Button>
            <Button variant="outline" type="button" className={cn(kpBtnSecondary)} asChild>
              <Link href="/showing-hq/showings">Cancel</Link>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
