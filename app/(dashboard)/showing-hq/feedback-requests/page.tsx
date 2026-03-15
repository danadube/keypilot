"use client";

import Link from "next/link";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";

type Showing = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  feedbackRequired: boolean;
  feedbackRequestStatus: string | null;
  property: { address1: string; city: string; state: string };
};

export default function FeedbackRequestsPage() {
  const [showings, setShowings] = useState<Showing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/showing-hq/showings?feedbackOnly=true")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setShowings(json.data ?? []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading feedback requests..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const pending = showings.filter(
    (s) => !s.feedbackRequestStatus || s.feedbackRequestStatus === "PENDING" || s.feedbackRequestStatus === "SENT"
  );

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="Feedback Requests"
        description="Showings requiring agent feedback after the visit."
      />
      <BrandCard elevated padded>
        {pending.length === 0 ? (
          <BrandEmptyState
            compact
            variant="premium"
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="No feedback requests"
            description="When you mark a showing with feedback required, it will appear here. The feedback workflow will send requests to buyer agents."
            action={
              <BrandButton variant="secondary" size="sm" asChild>
                <Link href="/showing-hq/showings/new">Add showing with feedback</Link>
              </BrandButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brand-border)]">
                  <th className="pb-3 text-left font-semibold">Property</th>
                  <th className="pb-3 text-left font-semibold">Date</th>
                  <th className="pb-3 text-left font-semibold">Buyer Agent</th>
                  <th className="pb-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {pending.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                    <td className="py-3 font-medium">
                      {s.property.address1}, {s.property.city}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {new Date(s.scheduledAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {s.buyerAgentName ?? s.buyerAgentEmail ?? "—"}
                    </td>
                    <td className="py-3">
                      <span className="text-amber-600">
                        {s.feedbackRequestStatus || "Pending"}
                      </span>
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
