"use client";

import Link from "next/link";
import { ShowingHQPageHero } from "@/components/showing-hq/ShowingHQPageHero";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useEffect, useState } from "react";
import { ClipboardCheck, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeedbackRequest = {
  id: string;
  token: string;
  status: string;
  requestedAt: string;
  respondedAt: string | null;
  interestLevel: string | null;
  reasons: string[] | null;
  note: string | null;
  showing: { scheduledAt: string; buyerAgentName: string | null; buyerAgentEmail: string | null };
  property: { address1: string; city: string; state: string };
};

export default function FeedbackRequestsPage() {
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/showing-hq/feedback-requests")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setRequests(json.data ?? []);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (id: string, token: string) => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/feedback/${token}` : "";
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (loading) return <PageLoading message="Loading feedback requests..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;

  const pending = requests.filter((r) => r.status === "PENDING");
  const responded = requests.filter((r) => r.status === "RESPONDED");
  const expired = requests.filter((r) => r.status === "EXPIRED");

  return (
    <div className="min-h-0 flex flex-col gap-6 bg-transparent">
      <ShowingHQPageHero
        title="Feedback Requests"
        description="Private showing feedback — share the link with the buyer agent to capture quick feedback."
      />
      <BrandCard elevated padded>
        {requests.length === 0 ? (
          <BrandEmptyState
            compact
            variant="premium"
            icon={<ClipboardCheck className="h-6 w-6" />}
            title="No feedback requests"
            description="When you add a showing with feedback required, a feedback request and shareable link are created."
            action={
              <BrandButton variant="secondary" size="sm" asChild>
                <Link href="/showing-hq/showings/new">Add showing with feedback</Link>
              </BrandButton>
            }
          />
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--brand-text)]">Pending</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--brand-border)]">
                        <th className="pb-3 text-left font-semibold">Property</th>
                        <th className="pb-3 text-left font-semibold">Date</th>
                        <th className="pb-3 text-left font-semibold">Buyer Agent</th>
                        <th className="pb-3 text-left font-semibold">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border)]">
                      {pending.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                          <td className="py-3 font-medium">
                            {r.property.address1}, {r.property.city}
                          </td>
                          <td className="py-3 text-[var(--brand-text-muted)]">
                            {new Date(r.showing.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-[var(--brand-text-muted)]">
                            {r.showing.buyerAgentName ?? r.showing.buyerAgentEmail ?? "—"}
                          </td>
                          <td className="py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(r.id, r.token)}
                            >
                              {copiedId === r.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              <span className="ml-1.5">{copiedId === r.id ? "Copied" : "Copy link"}</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {responded.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--brand-text)]">Responded</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--brand-border)]">
                        <th className="pb-3 text-left font-semibold">Property</th>
                        <th className="pb-3 text-left font-semibold">Date</th>
                        <th className="pb-3 text-left font-semibold">Interest</th>
                        <th className="pb-3 text-left font-semibold">Responded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--brand-border)]">
                      {responded.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                          <td className="py-3 font-medium">
                            {r.property.address1}, {r.property.city}
                          </td>
                          <td className="py-3 text-[var(--brand-text-muted)]">
                            {new Date(r.showing.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-[var(--brand-text-muted)]">
                            {r.interestLevel ? r.interestLevel.replace(/_/g, " ").toLowerCase() : "—"}
                          </td>
                          <td className="py-3 text-[var(--brand-text-muted)]">
                            {r.respondedAt ? new Date(r.respondedAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {expired.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--brand-text-muted)]">Expired</h3>
                <p className="text-sm text-[var(--brand-text-muted)]">
                  {expired.length} request{expired.length !== 1 ? "s" : ""} expired
                </p>
              </div>
            )}
          </div>
        )}
      </BrandCard>
    </div>
  );
}
