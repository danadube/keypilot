"use client";

import { useState } from "react";
import { BrandButton } from "@/components/ui/BrandButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OpenHouseForForm = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    imageUrl?: string | null;
  };
};

type SignInFormFieldsProps = {
  openHouse: OpenHouseForForm;
  signInMethod: "TABLET" | "QR";
  onSuccess?: () => void;
  /** When true, use a more compact layout for tablet/embedded use */
  compact?: boolean;
};

export function SignInFormFields({
  openHouse,
  signInMethod,
  onSuccess,
  compact = false,
}: SignInFormFieldsProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasAgent, setHasAgent] = useState<string>("");
  const [interestLevel, setInterestLevel] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email?.trim() && !phone?.trim()) {
      setError("Please provide at least email or phone");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/visitor-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openHouseId: openHouse.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          hasAgent: hasAgent === "" ? undefined : hasAgent === "yes",
          interestLevel:
            interestLevel === ""
              ? undefined
              : interestLevel === "VERY_INTERESTED"
                ? "VERY_INTERESTED"
                : interestLevel === "MAYBE_INTERESTED"
                  ? "MAYBE_INTERESTED"
                  : interestLevel === "JUST_BROWSING"
                    ? "JUST_BROWSING"
                    : undefined,
          notes: notes.trim() || undefined,
          signInMethod,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setHasAgent("");
      setInterestLevel("");
      setNotes("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-sm font-medium">
            First name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">
            Last name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="h-12 text-base"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone
        </Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="h-11 text-base"
        />
      </div>
      <p className="text-xs text-[var(--brand-text-muted)]">
        Please provide at least email or phone so we can follow up.
      </p>
      <div className="space-y-2">
        <Label>What best describes your interest in this home?</Label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "VERY_INTERESTED", label: "Very interested" },
            { value: "MAYBE_INTERESTED", label: "Maybe interested" },
            { value: "JUST_BROWSING", label: "Just browsing" },
          ].map((opt) => (
            <BrandButton
              key={opt.value}
              type="button"
              variant={interestLevel === opt.value ? "primary" : "secondary"}
              size="sm"
              className="h-10 touch-manipulation font-semibold shadow-sm"
              onClick={() => setInterestLevel(interestLevel === opt.value ? "" : opt.value)}
            >
              {opt.label}
            </BrandButton>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Do you have a real estate agent?</Label>
        <div className="flex gap-2">
          <BrandButton
            type="button"
            variant={hasAgent === "yes" ? "primary" : "secondary"}
            size="sm"
            className="h-10 flex-1 touch-manipulation font-semibold shadow-sm"
            onClick={() => setHasAgent(hasAgent === "yes" ? "" : "yes")}
          >
            Yes
          </BrandButton>
          <BrandButton
            type="button"
            variant={hasAgent === "no" ? "primary" : "secondary"}
            size="sm"
            className="h-10 flex-1 touch-manipulation font-semibold shadow-sm"
            onClick={() => setHasAgent(hasAgent === "no" ? "" : "no")}
          >
            No
          </BrandButton>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything you'd like to share?"
          rows={compact ? 2 : 2}
        />
      </div>
      <BrandButton
        type="submit"
        variant="primary"
        size={compact ? "md" : "lg"}
        className="h-12 w-full text-base font-semibold shadow-md sm:h-12"
        disabled={submitting}
      >
        {submitting ? "Checking in..." : "Check in"}
      </BrandButton>
    </form>
  );
}
