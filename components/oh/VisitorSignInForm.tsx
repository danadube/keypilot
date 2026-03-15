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
    <div className="min-h-screen bg-slate-100">
      {/* Hero banner — property image with gradient overlay for readability */}
      {hasImage && (
        <div className="relative h-48 w-full overflow-hidden bg-slate-200 sm:h-56 md:h-64">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase URL */}
          <img
            src={oh.property.imageUrl!}
            alt={oh.property.address1}
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
            aria-hidden
          />
        </div>
      )}

      <div className={`mx-auto max-w-md px-4 pb-10 pt-6 sm:px-6 sm:pt-8 ${hasImage ? "-mt-10 sm:-mt-14" : ""}`}>
        <Card
          className={`w-full shadow-xl ${hasImage ? "overflow-hidden rounded-2xl border-0" : "rounded-2xl border border-slate-200/80"}`}
        >
          <CardHeader className="space-y-2 pb-3 pt-6 sm:px-6 sm:pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {oh.property.address1}
            </h1>
            {oh.property.address2 && (
              <p className="text-sm text-slate-600">{oh.property.address2}</p>
            )}
            <p className="text-base text-slate-600">{cityState}</p>
            <p className="text-sm font-medium text-slate-500">{timeRange}</p>

            <p className="pt-4 text-base text-slate-700">
              Welcome to the open house.
            </p>
            <p className="text-sm text-slate-600">
              Please sign in before touring the property.
            </p>
            <p className="text-sm text-slate-600">
              Sign in to receive the property flyer and additional details after your visit.
            </p>
            {oh.flyerUrl && (
              <a
                href={oh.flyerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                View property flyer
              </a>
            )}

            {hasHost && (
              <div className="flex items-center gap-3 pt-3">
                {oh.branding?.headshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external Supabase URL
                  <img
                    src={oh.branding.headshotUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-slate-200/80"
                  />
                ) : oh.branding?.logoUrl ? (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200/80 p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={oh.branding.logoUrl} alt="" className="max-h-8 max-w-full object-contain" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    Hosted by {hostName}
                  </p>
                  {oh.branding?.brokerageName && (
                    <p className="text-xs text-slate-500">{oh.branding.brokerageName}</p>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="sm:px-6 sm:pb-6">
            <SignInFormFields
              openHouse={oh}
              signInMethod="QR"
              onSuccess={() => setSuccess(true)}
            />
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-[10px] text-slate-400">
          Powered by KeyPilot
        </p>
      </div>
    </div>
  );
}
