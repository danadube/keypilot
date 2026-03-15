"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Calendar, Plus, Inbox, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Showing = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  buyerName: string | null;
  notes: string | null;
  feedbackRequired: boolean;
  source: string;
  scrapeStatus: string | null;
  feedbackRequestStatus: string | null;
  property: { address1: string; city: string; state: string };
};

export function ShowingsList() {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setLoading(true);
    fetch("/api/v1/showing-hq/showings")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setShowings(json.data || []);
      })
      .catch(() => setError("Failed to load showings"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading showings..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="All Showings"
        description="Single private appointments — separate from open houses."
        actions={
          <BrandButton variant="primary" size="sm" asChild>
            <Link href="/showing-hq/showings/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Showing
            </Link>
          </BrandButton>
        }
      />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/showing-hq/supra-inbox">
            <Inbox className="mr-1.5 h-3.5 w-3.5" />
            Supra Inbox
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/showing-hq/feedback-requests">
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
            Feedback Requests
          </Link>
        </Button>
      </div>

      <BrandCard elevated padded>
        {showings.length === 0 ? (
          <BrandEmptyState
            compact
            variant="premium"
            icon={<Calendar className="h-6 w-6" />}
            title="No showings yet"
            description="Add a single private showing or check Supra Inbox for scraped showing notifications."
            action={
              <BrandButton variant="primary" size="sm" asChild>
                <Link href="/showing-hq/showings/new">Add Showing</Link>
              </BrandButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brand-border)]">
                  <th className="pb-3 text-left font-semibold">Property</th>
                  <th className="pb-3 text-left font-semibold">Date & Time</th>
                  <th className="pb-3 text-left font-semibold">Buyer Agent</th>
                  <th className="pb-3 text-left font-semibold">Buyer</th>
                  <th className="pb-3 text-left font-semibold">Feedback</th>
                  <th className="pb-3 text-left font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {showings.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                    <td className="py-3 font-medium">{s.property.address1}</td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {formatDate(s.scheduledAt)} · {formatTime(s.scheduledAt)}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {s.buyerAgentName ?? "—"}
                      {s.buyerAgentEmail && (
                        <span className="block text-xs">{s.buyerAgentEmail}</span>
                      )}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">{s.buyerName ?? "—"}</td>
                    <td className="py-3">
                      {s.feedbackRequired ? (
                        <Badge variant="outline" className="text-xs">Requested</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary" className="text-xs">
                        {s.source}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BrandCard>
    </div>
  );
}
