"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/track-usage-client";
import { Button } from "@/components/ui/button";
import { BrandModal } from "@/components/ui/BrandModal";
import { MessageSquare, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug report" },
  { value: "feature", label: "Feature request" },
  { value: "general", label: "General feedback" },
] as const;

const FEEDBACK_EMAIL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_FEEDBACK_EMAIL) ||
  "feedback@keypilot.app";

export function FeedbackButton({
  variant = "ghost",
  size = "sm",
  className,
  children,
}: {
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("general");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!message.trim()) return;
    trackEvent("feedback_submitted", { feedbackType: type });
    const subject = `ShowingHQ Beta Feedback – ${FEEDBACK_TYPES.find((t) => t.value === type)?.label ?? type}`;
    const body = `${message.trim()}\n\n---\nType: ${type}\nSent from ShowingHQ Beta`;
    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setOpen(false);
    setMessage("");
    setType("general");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMessage("");
      setType("general");
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            Send feedback
          </>
        )}
      </Button>
      <BrandModal
        open={open}
        onOpenChange={handleOpenChange}
        title="Send feedback"
        description="Help us improve ShowingHQ. Your feedback goes directly to our team."
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!message.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Open email
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              placeholder="What's on your mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <p className="text-xs text-[var(--brand-text-muted)]">
            Opens your default email app with feedback prefilled. We respond to bug reports quickly.
          </p>
        </div>
      </BrandModal>
    </>
  );
}
