"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/track-usage-client";
import Link from "next/link";
import { Printer } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { SignInFormFields } from "@/components/oh/SignInFormFields";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";

type SignInData = {
  id: string;
  title: string;
  status?: string;
  startAt: string;
  endAt: string;
  qrSlug: string;
  qrCodeDataUrl: string;
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
  };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status?: string) {
  if (!status) return null;
  const variant =
    status === "ACTIVE" ? "default" : status === "SCHEDULED" ? "secondary" : "outline";
  const label = status === "ACTIVE" ? "Live" : status === "SCHEDULED" ? "Scheduled" : status;
  return <Badge variant={variant}>{label}</Badge>;
}

export function SignInDisplay({ openHouseId }: { openHouseId: string }) {
  const [data, setData] = useState<SignInData | null>(null);

  useEffect(() => {
    trackEvent("sign_in_page_opened", { context: "tablet", openHouseId });
  }, [openHouseId]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  if (loading) {
    return (
      <OpenHouseSupportPageFrame openHouseId={openHouseId}>
        <div className="flex justify-center py-16">
          <PageLoading message="Loading sign-in display..." />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }
  if (error || !data) {
    return (
      <OpenHouseSupportPageFrame openHouseId={openHouseId}>
        <div className="py-8">
          <ErrorMessage
            message={error || "Not found"}
            onRetry={() => {
              setError(null);
              setLoading(true);
              fetch(`/api/v1/open-houses/${openHouseId}`)
                .then((res) => res.json())
                .then((json) => {
                  if (json.error) setError(json.error.message);
                  else setData(json.data);
                })
                .catch(() => setError("Failed to load"))
                .finally(() => setLoading(false));
            }}
          />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }

  const signInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/oh/${data.qrSlug}`
      : "";
  const openHouseForForm = {
    id: data.id,
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    property: data.property,
  };

  const contextSubtitle = [data.property.address1, data.property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <OpenHouseSupportPageFrame
      openHouseId={openHouseId}
      contextSubtitle={contextSubtitle}
      maxWidthClass="max-w-4xl"
      headerRight={
        <Link
          href={`/open-houses/${openHouseId}/sign-in/print`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-kp-on-surface-variant transition-colors hover:text-kp-on-surface"
        >
          <Printer className="h-4 w-4" />
          Print QR poster
        </Link>
      }
    >
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-kp-on-surface sm:text-2xl">
              Host sign-in
            </h1>
            <p className="mt-1 text-sm text-kp-on-surface-variant">
              Tablet-friendly QR and walk-in check-in for this event.
            </p>
            <p className="mt-3 text-sm text-kp-on-surface">
              {data.property.address1}
              {data.property.address2 ? `, ${data.property.address2}` : ""}
            </p>
            <p className="text-sm text-kp-on-surface-variant">
              {data.property.city}, {data.property.state} {data.property.zip}
            </p>
            <p className="mt-2 text-sm text-kp-on-surface-variant">
              {formatDate(data.startAt)} · {formatTime(data.startAt)}
              {" – "}
              {formatTime(data.endAt)}
            </p>
          </div>
          <div>{statusBadge(data.status)}</div>
        </div>
      </header>

      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-kp-outline bg-white shadow-sm">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-lg font-semibold text-kp-on-surface">
              Scan to sign in on a phone
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm text-kp-on-surface-variant">
              Visitors can point their camera at the QR code to open the sign-in
              page instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            {data.qrCodeDataUrl && (
              <div className="flex items-center justify-center rounded-xl border border-kp-outline bg-white p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrCodeDataUrl}
                  alt="QR Code for visitor sign-in"
                  width={280}
                  height={280}
                  className="h-auto w-auto"
                />
              </div>
            )}
            <div className="w-full max-w-sm">
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-kp-on-surface-variant">
                Short link
              </p>
              <p className="break-all text-center font-mono text-sm text-kp-on-surface-variant">
                {signInUrl}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-kp-outline bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-kp-on-surface">
              Check in here
            </CardTitle>
            <CardDescription className="mt-1.5 text-kp-on-surface-variant">
              Sign in directly on this tablet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInFormFields
              openHouse={openHouseForForm}
              signInMethod="TABLET"
              compact
            />
          </CardContent>
        </Card>
      </div>
    </OpenHouseSupportPageFrame>
  );
}
