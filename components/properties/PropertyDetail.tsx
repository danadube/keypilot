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

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  listingPrice?: string | number | null;
  notes?: string | null;
  openHouses?: { id: string; title: string; startAt: string }[];
};

export function PropertyDetail({ id }: { id: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/properties/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperty(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) return <PageLoading message="Loading property…" />;
  if (error || !property)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const formatPrice = (p: string | number | null | undefined) => {
    if (p == null) return "—";
    const n = typeof p === "string" ? parseFloat(p) : p;
    return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
  };
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/properties">← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {property.address1}
          {property.address2 && ` ${property.address2}`}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Property details</CardTitle>
          <CardDescription>
            {property.city}, {property.state} {property.zip}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Listing price:</span>{" "}
            {formatPrice(property.listingPrice)}
          </p>
          {property.notes && (
            <p>
              <span className="font-medium">Notes:</span> {property.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open houses</CardTitle>
          <CardDescription>Events at this property</CardDescription>
        </CardHeader>
        <CardContent>
          {!property.openHouses?.length ? (
            <p className="text-muted-foreground py-4">
              No open houses yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {property.openHouses.map((oh) => (
                <li key={oh.id} className="flex items-center justify-between">
                  <span>
                    {oh.title} — {formatDate(oh.startAt)}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/open-houses/${oh.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button className="mt-4" asChild>
            <Link href="/open-houses/new">New open house</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
