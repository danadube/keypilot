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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  property: { address1: string; city: string; state: string };
  _count: { visitors: number };
};

export function OpenHousesList() {
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/open-houses")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setOpenHouses(json.data || []);
      })
      .catch(() => setError("Failed to load open houses"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <PageLoading />;
  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const statusVariant = (
    s: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "ACTIVE" || s === "SCHEDULED") return "default";
    if (s === "COMPLETED") return "secondary";
    if (s === "CANCELLED") return "destructive";
    return "outline";
  };

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <BrandPageHeader
        title="Showings"
        description="Create and manage your showing events"
        actions={
          <BrandButton asChild>
            <Link href="/open-houses/new">New Showing</Link>
          </BrandButton>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming & Recent</CardTitle>
          <CardDescription>
            Create and manage your showing events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {openHouses.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No showings yet. Create one to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Visitors</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openHouses.map((oh) => (
                  <TableRow key={oh.id}>
                    <TableCell className="font-medium">{oh.title}</TableCell>
                    <TableCell>
                      {oh.property.address1}, {oh.property.city},{" "}
                      {oh.property.state}
                    </TableCell>
                    <TableCell>
                      {formatDate(oh.startAt)} {formatTime(oh.startAt)}–{formatTime(oh.endAt)}
                    </TableCell>
                    <TableCell>{oh._count.visitors}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(oh.status)}>{oh.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/open-houses/${oh.id}`}>View</Link>
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
