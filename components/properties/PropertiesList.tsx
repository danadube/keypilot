"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/ui/BrandButton";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { UI_COPY } from "@/lib/ui-copy";

type Property = {
  id: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  listingPrice?: string | number | null;
  notes?: string | null;
  _count?: { openHouses: number };
};

export function PropertiesList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/properties")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setProperties(json.data || []);
      })
      .catch(() => setError(UI_COPY.errors.load("properties")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <PageLoading />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const formatPrice = (p: string | number | null | undefined) => {
    if (p == null) return "—";
    const n = typeof p === "string" ? parseFloat(p) : p;
    return isNaN(n) ? "—" : `$${n.toLocaleString()}`;
  };

  const totalOpenHouses = properties.reduce((sum, p) => sum + (p._count?.openHouses ?? 0), 0);

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <BrandPageHeader
        title="Properties"
        description="Manage listings for open house events"
        actions={
          <BrandButton asChild>
            <Link href="/properties/new">Add property</Link>
          </BrandButton>
        }
      />

      {/* Summary metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Total properties</p>
          <p className="text-2xl font-semibold">{properties.length}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">Open houses linked</p>
          <p className="text-2xl font-semibold">{totalOpenHouses}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-muted-foreground">Quick action</p>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "mt-1")} asChild>
            <Link href="/open-houses/new">Schedule open house</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your properties</CardTitle>
          <CardDescription>
            Add and manage property records for open house events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No properties yet. Add one to create open houses.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Open houses</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.address1}
                      {p.address2 && (
                        <span className="text-muted-foreground"> {p.address2}</span>
                      )}
                    </TableCell>
                    <TableCell>{p.city}</TableCell>
                    <TableCell>{p.state}</TableCell>
                    <TableCell>{formatPrice(p.listingPrice)}</TableCell>
                    <TableCell>{p._count?.openHouses ?? 0}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
                        <Link href={`/properties/${p.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
