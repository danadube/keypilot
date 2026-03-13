"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name *</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Please provide at least email or phone
      </p>
      <div className="space-y-2">
        <Label>Do you have a real estate agent?</Label>
        <Select value={hasAgent} onValueChange={setHasAgent}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
          </SelectContent>
        </Select>
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
      <Button type="submit" className="w-full" size={compact ? "default" : "lg"} disabled={submitting}>
        {submitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
