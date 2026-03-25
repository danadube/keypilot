"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOST_FEEDBACK_TAGS, TRAFFIC_LEVELS } from "@/lib/validations/open-house";

const TRAFFIC_LABELS: Record<string, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  VERY_HIGH: "Very high",
};

const TAG_LABELS: Record<string, string> = {
  "price high": "Price high",
  "kitchen dated": "Kitchen dated",
  "layout liked": "Layout liked",
  "backyard liked": "Backyard liked",
  "location concern": "Location concern",
};

type Props = {
  token: string;
  initialData: {
    trafficLevel?: string | null;
    feedbackTags?: unknown;
    hostNotes?: string | null;
  };
  onSave: () => void;
};

export function HostDashboardFeedbackForm({
  token,
  initialData,
  onSave,
}: Props) {
  const [trafficLevel, setTrafficLevel] = useState<string | null>(
    (initialData.trafficLevel as string) ?? null
  );
  const [feedbackTags, setFeedbackTags] = useState<string[]>(
    Array.isArray(initialData.feedbackTags) ? [...initialData.feedbackTags] : []
  );
  const [hostNotes, setHostNotes] = useState(
    (initialData.hostNotes as string) ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/host/invite/${token}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trafficLevel: trafficLevel ?? null,
          feedbackTags,
          hostNotes: hostNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Traffic level</Label>
        <Select
          value={trafficLevel ?? ""}
          onValueChange={(v) => setTrafficLevel(v || null)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select traffic level" />
          </SelectTrigger>
          <SelectContent>
            {TRAFFIC_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {TRAFFIC_LABELS[level] ?? level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Feedback tags</Label>
        <div className="flex flex-wrap gap-3">
          {HOST_FEEDBACK_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={feedbackTags.includes(tag)}
                onChange={() => toggleTag(tag)}
                className="h-4 w-4 rounded border-[var(--brand-border)]"
              />
              {TAG_LABELS[tag] ?? tag}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hostNotes">Quick notes</Label>
        <Textarea
          id="hostNotes"
          value={hostNotes}
          onChange={(e) => setHostNotes(e.target.value)}
          placeholder="Notes about the open house..."
          rows={4}
          className="resize-none"
        />
      </div>

      <Button
        type="submit"
        variant="outline"
        className={cn(kpBtnPrimary, "border-transparent")}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save feedback"}
      </Button>
    </form>
  );
}
