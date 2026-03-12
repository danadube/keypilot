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
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PageLoading } from "@/components/shared/PageLoading";

type FollowUpDraft = {
  id: string;
  subject: string;
  body: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string; email: string | null };
};

export function FollowUpsList({ openHouseId }: { openHouseId: string }) {
  const [drafts, setDrafts] = useState<FollowUpDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/open-houses/${openHouseId}/follow-ups`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setDrafts(json.data || []);
      })
      .catch(() => setError("Failed to load drafts"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  const loadDrafts = () => {
    fetch(`/api/v1/open-houses/${openHouseId}/follow-ups`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setDrafts(json.data || []);
      })
      .catch(() => setError("Failed to load drafts"));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/v1/open-houses/${openHouseId}/follow-ups/generate`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async (draftId: string) => {
    setSendingId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}/send`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  if (loading) return <PageLoading message="Loading drafts..." />;
  if (error)
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          loadDrafts();
        }}
      />
    );

  const statusVariant = (
    s: string
  ): "default" | "secondary" | "outline" | "destructive" => {
    if (s === "SENT_MANUAL") return "default";
    if (s === "REVIEWED") return "secondary";
    if (s === "ARCHIVED") return "outline";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/open-houses/${openHouseId}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold">Follow-ups</h1>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Generating..." : "Generate drafts for new visitors"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email drafts</CardTitle>
          <CardDescription>
            AI-generated follow-up emails for visitors without drafts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No drafts yet. Generate drafts for visitors who don&apos;t have
              one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.contact.firstName} {d.contact.lastName}
                      {d.contact.email && (
                        <span className="text-muted-foreground ml-2 text-sm">
                          {d.contact.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{d.subject}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      {(d.status === "DRAFT" || d.status === "REVIEWED") &&
                        d.contact.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSend(d.id)}
                            disabled={sendingId === d.id}
                          >
                            {sendingId === d.id ? "Sending…" : "Send"}
                          </Button>
                        )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contacts/${d.contact.id}`}>View</Link>
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
