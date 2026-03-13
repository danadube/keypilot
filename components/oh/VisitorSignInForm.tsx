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
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
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

  const address = [oh.property.address1, oh.property.address2, oh.property.city, oh.property.state, oh.property.zip]
    .filter(Boolean)
    .join(", ");

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{oh.title}</CardTitle>
          <CardDescription>{address}</CardDescription>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(oh.startAt)} – {new Date(oh.endAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </p>
        </CardHeader>
        <CardContent>
          <SignInFormFields
            openHouse={oh}
            signInMethod="QR"
            onSuccess={() => setSuccess(true)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
