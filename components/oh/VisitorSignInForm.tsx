"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInFormFields } from "@/components/oh/SignInFormFields";

type OpenHouseInfo = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  agentName?: string | null;
  flyerUrl?: string | null;
  qrCodeDataUrl?: string | null;
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    imageUrl?: string | null;
  };
  branding?: {
    displayName: string | null;
    brokerageName: string | null;
    headshotUrl: string | null;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
  };
};

export function VisitorSignInForm({ slug }: { slug: string }) {
  const [oh, setOh] = useState<OpenHouseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/open-houses/by-slug/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOh(json.data);
      })
      .catch(() => setError("Failed to load open house"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (error && !oh) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Open house not found</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  if (!oh) return null;

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Thank you!</CardTitle>
            <CardDescription>
              You&apos;re signed in. We&apos;ll be in touch soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSuccess(false)}
            >
              Sign in another person
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cityState = [oh.property.city, oh.property.state].filter(Boolean).join(", ");
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const timeRange = `${formatDate(oh.startAt)} · ${formatTime(oh.startAt)} – ${formatTime(oh.endAt)}`;

  const hasImage = !!oh.property?.imageUrl?.trim();
  const hostName = oh.branding?.displayName ?? oh.agentName;
  const hasHost = !!(hostName || oh.branding?.brokerageName);

  return (
    <div className="min-h-screen bg-slate-100 md:bg-white">
      {/* 2-column grid: image left, form right. Stack on mobile. */}
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
        {/* Left: property image — never overlaps form */}
        <div className="relative min-h-[200px] overflow-hidden bg-slate-200 md:h-screen">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase URL
            <img
              src={oh.property.imageUrl!}
              alt={oh.property.address1}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center md:h-full">
              <p className="text-sm text-slate-400">No image</p>
            </div>
          )}
        </div>

        {/* Right: sign-in form — centered, max-width 420px, scrolls when needed */}
        <div className="flex min-h-0 flex-col items-center justify-center overflow-y-auto px-4 py-8 md:px-8 md:py-10">
          <div className="w-full max-w-[420px] rounded-xl border border-slate-200/80 bg-white p-6 shadow-md">
            {/* Header section */}
            <div className="space-y-4">
              <h1 className="text-xl font-semibold tracking-tight text-slate-600">
                Welcome to the Open House
              </h1>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-slate-900">
                  {oh.property.address1}
                </p>
                {oh.property.address2 && (
                  <p className="text-sm text-slate-600">{oh.property.address2}</p>
                )}
                <p className="text-base text-slate-600">{cityState}</p>
                <p className="text-sm font-medium text-slate-500">{timeRange}</p>
              </div>

              <p className="text-base text-slate-700">
                Please sign in before touring the property.
              </p>

              {oh.flyerUrl && (
                <a
                  href={oh.flyerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:bg-slate-100"
                >
                  <p className="text-sm font-medium text-slate-800">
                    Property Details
                  </p>
                  <p className="mt-0.5 text-sm text-blue-600 hover:text-blue-800">
                    Download Property Flyer (PDF)
                  </p>
                </a>
              )}

              {hasHost && (
                <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hosted by
                  </p>
                  <div className="flex items-center gap-3">
                    {oh.branding?.headshotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external Supabase URL
                      <img
                        src={oh.branding.headshotUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200/80"
                      />
                    ) : oh.branding?.logoUrl ? (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200/80 p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={oh.branding.logoUrl} alt="" className="max-h-9 max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <span className="text-lg font-medium">
                          {hostName?.charAt(0) ?? "?"}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{hostName}</p>
                      {oh.branding?.brokerageName && (
                        <p className="text-sm text-slate-500">
                          {oh.branding.brokerageName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <SignInFormFields
                openHouse={oh}
                signInMethod="QR"
                onSuccess={() => setSuccess(true)}
              />
            </div>

            {/* QR optional on desktop/tablet only — hidden on phones so visitors use the form directly */}
            {oh.qrCodeDataUrl && (
              <div className="mt-6 hidden md:block rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                  Or scan to open on your phone
                </p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={oh.qrCodeDataUrl}
                    alt="Scan to open sign-in on your phone"
                    width={120}
                    height={120}
                    className="rounded border border-slate-200 bg-white p-1"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-[10px] text-slate-400">
            Powered by KeyPilot
          </p>
        </div>
      </div>
    </div>
  );
}
