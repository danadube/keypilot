"use client";

import { useCallback, useEffect, useState } from "react";
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

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  hasAgent: boolean | null;
  timeline: string | null;
  notes: string | null;
  source: string;
};

type Activity = {
  id: string;
  activityType: string;
  body: string;
  occurredAt: string;
};

export function ContactDetail({ id }: { id: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/contacts/${id}`),
      fetch(`/api/v1/contacts/${id}/activities`),
    ])
      .then(async ([cRes, aRes]) => {
        const cJson = await cRes.json();
        const aJson = await aRes.json();
        if (cJson.error) throw new Error(cJson.error.message);
        setContact(cJson.data);
        setActivities(aJson.data || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageLoading message="Loading contact…" />;
  if (error || !contact)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contacts">← Back</Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {contact.firstName} {contact.lastName}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact info</CardTitle>
          <CardDescription>Lead from {contact.source}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>
            <span className="font-medium">Email:</span>{" "}
            {contact.email || "—"}
          </p>
          <p>
            <span className="font-medium">Phone:</span>{" "}
            {contact.phone || "—"}
          </p>
          {contact.hasAgent != null && (
            <p>
              <span className="font-medium">Has agent:</span>{" "}
              {contact.hasAgent ? "Yes" : "No"}
            </p>
          )}
          {contact.timeline && (
            <p>
              <span className="font-medium">Timeline:</span> {contact.timeline}
            </p>
          )}
          {contact.notes && (
            <p>
              <span className="font-medium">Notes:</span> {contact.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Timeline of events</CardDescription>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground py-4">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted-foreground shrink-0">
                    {formatDate(a.occurredAt)}
                  </span>
                  <span className="text-sm">{a.body}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
