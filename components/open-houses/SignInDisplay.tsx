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

type SignInData = {
  id: string;
  title: string;
  qrSlug: string;
  qrCodeDataUrl: string;
  property: { address1: string; city: string; state: string };
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/open-houses/${openHouseId}`}>← Back to details</Link>
        </Button>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{data.title}</CardTitle>
          <CardDescription>
            {data.property.address1}, {data.property.city}, {data.property.state}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <p className="text-xl font-semibold">Scan to sign in</p>
          {data.qrCodeDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.qrCodeDataUrl}
              alt="QR Code for sign-in"
              width={280}
              height={280}
              className="rounded-lg border"
            />
          )}
          <p className="break-all text-center text-sm text-muted-foreground">
            {signInUrl}
          </p>
          <Button asChild size="lg">
            <a href={signInUrl} target="_blank" rel="noopener noreferrer">
              Open sign-in page
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
