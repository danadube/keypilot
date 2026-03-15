"use client";

import { useEffect, useState, useRef } from "react";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, User } from "lucide-react";

type Profile = {
  id: string;
  displayName: string | null;
  brokerageName: string | null;
  headshotUrl: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
} | null;

export function BrandingPageContent() {
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [brokerageName, setBrokerageName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/v1/me/profile")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setProfile(json.data);
          setDisplayName(json.data.displayName ?? "");
          setBrokerageName(json.data.brokerageName ?? "");
          setPhone(json.data.phone ?? "");
          setEmail(json.data.email ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          brokerageName: brokerageName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.data) setProfile(json.data);
    } finally {
      setSaving(false);
    }
  };

  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeadshotUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/me/profile/headshot", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.data?.headshotUrl) {
        setProfile((p) => ({
          ...(p ?? {
            id: "",
            displayName: null,
            brokerageName: null,
            headshotUrl: null,
            logoUrl: null,
            phone: null,
            email: null,
            brandPrimaryColor: null,
            brandSecondaryColor: null,
          }),
          headshotUrl: json.data.headshotUrl,
        }));
      }
    } finally {
      setHeadshotUploading(false);
      e.target.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/me/profile/logo", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.data?.logoUrl) {
        setProfile((p) => ({
          ...(p ?? {
            id: "",
            displayName: null,
            brokerageName: null,
            headshotUrl: null,
            logoUrl: null,
            phone: null,
            email: null,
            brandPrimaryColor: null,
            brandSecondaryColor: null,
          }),
          logoUrl: json.data.logoUrl,
        }));
      }
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-text)]">Branding</h1>
        <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
          Add your logo and headshot so your sign-in page, follow-ups, and reports feel like your business.
        </p>
      </div>

      <BrandCard padded>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[var(--brand-text)]">
          <User className="h-4 w-4" />
          Your brand
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerageName">Brokerage name</Label>
              <Input
                id="brokerageName"
                value={brokerageName}
                onChange={(e) => setBrokerageName(e.target.value)}
                placeholder="e.g. Acme Realty"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profileEmail">Contact email</Label>
              <Input
                id="profileEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profilePhone">Contact phone</Label>
              <Input
                id="profilePhone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <BrandButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </BrandButton>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Headshot</Label>
              <div className="flex items-start gap-4">
                {profile?.headshotUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.headshotUrl}
                      alt="Headshot"
                      className="h-20 w-20 rounded-full object-cover border-2 border-[var(--brand-border)]"
                    />
                  </div>
                ) : null}
                <div>
                  <input
                    ref={headshotInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleHeadshotUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={headshotUploading}
                    onClick={() => headshotInputRef.current?.click()}
                  >
                    {headshotUploading ? "Uploading..." : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {profile?.headshotUrl ? "Change" : "Upload"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-start gap-4">
                {profile?.logoUrl ? (
                  <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.logoUrl}
                      alt="Logo"
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                ) : null}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? "Uploading..." : (
                      <>
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {profile?.logoUrl ? "Change" : "Upload"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-[var(--brand-text-muted)]">
          Your branding appears on public sign-in pages, follow-up emails, and reports — making every touchpoint feel personal.
        </p>
      </BrandCard>
    </div>
  );
}
