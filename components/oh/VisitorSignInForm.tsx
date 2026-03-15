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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero image when property has one */}
      {hasImage && (
        <div className="relative h-44 w-full overflow-hidden bg-slate-200 sm:h-52 md:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase URL */}
          <img
            src={oh.property.imageUrl!}
            alt={oh.property.address1}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      )}

      <div className={`mx-auto max-w-lg px-4 pb-8 sm:px-6 ${hasImage ? "pt-0 sm:pt-0" : "pt-6 sm:pt-8"}`}>
        <Card
          className={`w-full shadow-lg sm:shadow-xl ${hasImage ? "-mt-8 rounded-t-none sm:-mt-12 sm:rounded-t-lg" : "rounded-lg"}`}
        >
          <CardHeader className="space-y-1 pb-2 sm:px-6 sm:pt-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {oh.property.address1}
            </h1>
            {oh.property.address2 && (
              <p className="text-sm text-muted-foreground">{oh.property.address2}</p>
            )}
            <p className="text-base text-slate-600">{cityState}</p>
            <p className="text-sm text-muted-foreground">{timeRange}</p>
            <p className="pt-2 text-sm text-slate-600">
              Welcome to the open house. Please sign in before touring.
            </p>
            {(oh.branding?.displayName || oh.branding?.brokerageName || oh.agentName) && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2">
                {oh.branding?.headshotUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- external Supabase URL */
                  <img
                    src={oh.branding.headshotUrl}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : oh.branding?.logoUrl ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={oh.branding.logoUrl} alt="" className="max-h-8 max-w-full object-contain" />
                  </div>
                ) : null}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700">
                    Hosted by {oh.branding?.displayName ?? oh.agentName ?? "your agent"}
                  </p>
                  {oh.branding?.brokerageName && (
                    <p className="text-[10px] text-slate-500">{oh.branding.brokerageName}</p>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="sm:px-6 sm:pb-6">
            <p className="mb-4 text-xs text-muted-foreground">
              We&apos;ll use your information to follow up after your visit.
            </p>
            <SignInFormFields
              openHouse={oh}
              signInMethod="QR"
              onSuccess={() => setSuccess(true)}
            />
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Powered by KeyPilot
        </p>
      </div>
    </div>
  );
}
