"use client";

import { useState } from "react";
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
import { AF } from "@/lib/ui/action-feedback";

export function NewPropertyForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mlsNumber, setMlsNumber] = useState("");
  const [addressLookup, setAddressLookup] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [notes, setNotes] = useState("");

  const runLookup = async (url: string) => {
    setLookupError(null);
    setLookupLoading(true);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const d = json.data;
      setAddress1(d.address1);
      setAddress2(d.address2 || "");
      setCity(d.city);
      setState(d.state);
      setZip(d.zip);
      setListingPrice(d.listingPrice ? String(d.listingPrice) : "");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleMlsLookup = async () => {
    const mls = mlsNumber.trim();
    if (!mls) {
      setLookupError("Enter an MLS number");
      return;
    }
    await runLookup(`/api/v1/properties/lookup?mls=${encodeURIComponent(mls)}`);
  };

  const handleAddressLookup = async () => {
    const addr = addressLookup.trim();
    if (!addr) {
      setLookupError("Enter a full address");
      return;
    }
    await runLookup(`/api/v1/properties/lookup?address=${encodeURIComponent(addr)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address1.trim() || !city.trim() || !state.trim() || !zip.trim()) {
      setError("Please fill in required fields (address, city, state, zip)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const price = listingPrice.trim()
        ? parseFloat(listingPrice.replace(/[^0-9.]/g, ""))
        : undefined;
      const res = await fetch("/api/v1/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mlsNumber: mlsNumber.trim() || null,
          address1: address1.trim(),
          address2: address2.trim() || null,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          listingPrice: price && !isNaN(price) ? price : null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      router.push(`/properties/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
          <Link href="/properties">← Back to properties</Link>
        </Button>
        <h1 className="text-2xl font-semibold text-kp-on-surface">New property</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
          <CardDescription>
            Add a listing for open house events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4 rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Look up by address or MLS number
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Address (e.g. 123 Main St, Palm Desert, CA 92260)"
                  value={addressLookup}
                  onChange={(e) => {
                    setAddressLookup(e.target.value);
                    setLookupError(null);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary)}
                  onClick={handleAddressLookup}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? "Looking up…" : "By address"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="MLS # (e.g. 12345678)"
                  value={mlsNumber}
                  onChange={(e) => {
                    setMlsNumber(e.target.value);
                    setLookupError(null);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary)}
                  onClick={handleMlsLookup}
                  disabled={lookupLoading}
                >
                  {lookupLoading ? "Looking up…" : "By MLS #"}
                </Button>
              </div>
              {lookupError && (
                <p className="text-sm text-destructive">{lookupError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address1">Street address *</Label>
              <Input
                id="address1"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                placeholder="123 Main St"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address2">Apt / Unit (optional)</Label>
              <Input
                id="address2"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Apt 4"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP *</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingPrice">Listing price (optional)</Label>
              <Input
                id="listingPrice"
                type="text"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder="495000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className={cn(kpBtnPrimary, "border-0 shadow-md")}
              >
                {submitting ? AF.creating : "Create property"}
              </Button>
              <Button type="button" variant="outline" className={cn(kpBtnSecondary)} asChild>
                <Link href="/properties">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
