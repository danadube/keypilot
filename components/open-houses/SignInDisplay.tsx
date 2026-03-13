"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { SignInFormFields } from "@/components/oh/SignInFormFields";

type SignInData = {
  id: string;
  title: string;
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

export function SignInDisplay({ openHouseId }: { openHouseId: string }) {
  const [data, setData] = useState<SignInData | null>(null);
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

  const signInUrl = typeof window !== "undefined" ? `${window.location.origin}/oh/${data.qrSlug}` : "";
  const openHouseForForm = {
    id: data.id,
    title: data.title,
    startAt: data.startAt,
    endAt: data.endAt,
    property: data.property,
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/open-houses/${openHouseId}`}>← Back to details</Link>
        </Button>
      </div>

      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
        {/* QR Code – sign in on phone */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Scan to sign in on your phone</CardTitle>
            <CardDescription>
              Point your camera at the QR code to open the sign-in page
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {data.qrCodeDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.qrCodeDataUrl}
                alt="QR Code for sign-in"
                width={240}
                height={240}
                className="rounded-lg border"
              />
            )}
            <p className="break-all text-center text-xs text-muted-foreground">
              {signInUrl}
            </p>
          </CardContent>
        </Card>

        {/* Form – sign in directly on tablet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Or sign in here</CardTitle>
            <CardDescription>
              {data.title} – {data.property.address1}, {data.property.city}, {data.property.state}
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
