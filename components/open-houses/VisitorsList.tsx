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
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";

type Visitor = {
  id: string;
  signInMethod: string;
  submittedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

export function VisitorsList({ openHouseId }: { openHouseId: string }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/open-houses/${openHouseId}/visitors`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setVisitors(json.data || []);
      })
      .catch(() => setError("Failed to load visitors"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  if (loading) return <PageLoading message="Loading visitors..." />;
  if (error)
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          fetch(`/api/v1/open-houses/${openHouseId}/visitors`)
            .then((res) => res.json())
            .then((json) => {
              if (json.error) setError(json.error.message);
              else setVisitors(json.data || []);
            })
            .catch(() => setError("Failed to load visitors"))
            .finally(() => setLoading(false));
        }}
      />
    );

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/open-houses/${openHouseId}`}>← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">Visitors</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in list</CardTitle>
          <CardDescription>
            Visitors who signed in at this open house
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visitors.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No visitors yet. Share the QR link for sign-ins.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Sign-in</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.contact.firstName} {v.contact.lastName}
                    </TableCell>
                    <TableCell>{v.contact.email || "—"}</TableCell>
                    <TableCell>{v.contact.phone || "—"}</TableCell>
                    <TableCell>{v.signInMethod}</TableCell>
                    <TableCell>{formatDate(v.submittedAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contacts/${v.contact.id}`}>View</Link>
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
