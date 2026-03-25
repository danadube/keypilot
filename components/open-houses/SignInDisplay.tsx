"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/track-usage-client";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center">
        <PageLoading message="Loading sign-in display..." />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
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

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col py-8 px-6">
      {/* Back navigation + Print */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/open-houses/${openHouseId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to open house details
        </Link>
        <Link
          href={`/open-houses/${openHouseId}/sign-in/print`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-text)]"
        >
          <Printer className="h-4 w-4" />
          Print QR poster
        </Link>
      </div>

      {/* Page header */}
      <header className="mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--brand-text)]">
              Open House Sign-In
            </h1>
            <p className="mt-1 text-[var(--brand-text-muted)]">
              {data.property.address1}
              {data.property.address2 ? `, ${data.property.address2}` : ""}
            </p>
            <p className="text-sm text-[var(--brand-text-muted)]">
              {data.property.city}, {data.property.state} {data.property.zip}
            </p>
            <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
              {formatDate(data.startAt)} · {formatTime(data.startAt)}
              {" – "}
              {formatTime(data.endAt)}
            </p>
          </div>
          <div>{statusBadge(data.status)}</div>
        </div>
      </header>

      {/* Two-column layout: QR (slightly dominant) | Form */}
      <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* QR Code card */}
        <Card className="overflow-hidden border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-4 text-center">
            <CardTitle
              className="text-lg font-semibold"
              style={{ color: "var(--brand-text)" }}
            >
              Scan to sign in on your phone
            </CardTitle>
            <CardDescription className="mt-1.5 text-sm text-[var(--brand-text-muted)]">
              Visitors can point their camera at the QR code to open the sign-in
              page instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            {data.qrCodeDataUrl && (
              <div className="flex items-center justify-center rounded-xl border border-[var(--brand-border)] bg-white p-5">
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
              <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
                Short link
              </p>
              <p className="break-all text-center font-mono text-sm text-[var(--brand-text-muted)]">
                {signInUrl}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign-in form card */}
        <Card className="overflow-hidden border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-4">
            <CardTitle
              className="text-lg font-semibold"
              style={{ color: "var(--brand-text)" }}
            >
              Check in here
            </CardTitle>
            <CardDescription className="mt-1.5 text-[var(--brand-text-muted)]">
              Sign in directly on this tablet
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
    </div>
  );
}
