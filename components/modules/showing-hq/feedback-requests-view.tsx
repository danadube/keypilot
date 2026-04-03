"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { ClipboardCheck, Copy, Check, Mail } from "lucide-react";
import { UI_COPY } from "@/lib/ui-copy";

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

type BuyerAgentDraftShowing = {
  id: string;
  scheduledAt: string;
  buyerAgentName: string | null;
  buyerAgentEmail: string | null;
  feedbackRequestStatus: string | null;
  property: { address1: string; city: string; state: string };
};

export function FeedbackRequestsView() {
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [buyerAgentDraftShowings, setBuyerAgentDraftShowings] = useState<BuyerAgentDraftShowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/v1/showing-hq/feedback-requests").then((res) => res.json()),
      fetch("/api/v1/showing-hq/showings?buyerAgentDraftReview=true").then((res) => res.json()),
    ])
      .then(([frJson, shJson]) => {
        if (cancelled) return;
        if (frJson.error) setError(frJson.error.message);
        else setRequests(frJson.data ?? []);
        if (!shJson.error && Array.isArray(shJson.data)) {
          setBuyerAgentDraftShowings(shJson.data);
        }
      })
      .catch(() => { if (!cancelled) setError(UI_COPY.errors.load("feedback requests")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
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
    <div className="flex flex-col gap-6">
      {buyerAgentDraftShowings.length > 0 && (
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kp-teal/10">
              <Mail className="h-4 w-4 text-kp-teal" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-kp-on-surface">Buyer-agent feedback emails</h2>
              <p className="text-xs text-kp-on-surface-variant">
                Drafts from Supra showings — open to copy or create mail (your app adds the signature).
              </p>
            </div>
          </div>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-kp-outline">
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Property
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Showing
                  </th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Agent
                  </th>
                  <th className="w-[1%] whitespace-nowrap pb-2.5 pt-0.5 text-right text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kp-outline">
                {buyerAgentDraftShowings.slice(0, 15).map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-kp-surface-high">
                    <td className="py-2.5 font-medium text-kp-on-surface">
                      {s.property.address1}, {s.property.city}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                      {new Date(s.scheduledAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-2.5 text-kp-on-surface-variant">
                      {s.buyerAgentName ?? s.buyerAgentEmail ?? "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-xs")} asChild>
                        <Link href={`/showing-hq/showings/${s.id}?tab=feedback`}>
                          Open draft
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-kp-on-surface-variant">
            <Link href="/showing-hq/showings?buyerAgentDraftReview=true" className="font-medium text-kp-teal hover:underline">
              Full list in Showings
            </Link>
          </p>
        </div>
      )}

      {/* Summary strip */}
      {requests.length > 0 && (
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kp-gold/10">
                <ClipboardCheck className="h-5 w-5 text-kp-gold" />
              </div>
              <div>
                <p className="text-xs font-medium text-kp-on-surface-variant">Pending</p>
                <p className="text-xl font-semibold text-kp-on-surface">{pending.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kp-surface-high">
                <Check className="h-5 w-5 text-kp-on-surface-variant" />
              </div>
              <div>
                <p className="text-xs font-medium text-kp-on-surface-variant">Responded</p>
                <p className="text-xl font-semibold text-kp-on-surface">{responded.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-kp-on-surface-variant">Total requests</p>
              <p className="text-xl font-semibold text-kp-on-surface">{requests.length}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-kp-on-surface">No feedback requests</p>
            <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
              When you add a showing with feedback required, a feedback request and shareable link are created.
            </p>
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "mt-3 text-xs")}
              asChild
            >
              <Link href="/showing-hq/showings/new">Add showing with feedback</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {pending.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-kp-on-surface">Pending</h3>
                <div className="-mx-1 overflow-x-auto px-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-kp-outline">
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Property</th>
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Date</th>
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Buyer Agent</th>
                        <th className="w-[1%] whitespace-nowrap pb-2.5 pt-0.5 text-right text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kp-outline">
                      {pending.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-kp-surface-high">
                          <td className="py-2.5 font-medium text-kp-on-surface">
                            {r.property.address1}, {r.property.city}
                          </td>
                          <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                            {new Date(r.showing.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-kp-on-surface-variant">
                            {r.showing.buyerAgentName ?? r.showing.buyerAgentEmail ?? "—"}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(kpBtnSecondary, "h-7 text-xs")}
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
                <h3 className="mb-3 text-sm font-semibold text-kp-on-surface">Responded</h3>
                <div className="-mx-1 overflow-x-auto px-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-kp-outline">
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Property</th>
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Date</th>
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Interest</th>
                        <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Responded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kp-outline">
                      {responded.map((r) => (
                        <tr key={r.id} className="transition-colors hover:bg-kp-surface-high">
                          <td className="py-2.5 font-medium text-kp-on-surface">
                            {r.property.address1}, {r.property.city}
                          </td>
                          <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                            {new Date(r.showing.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 text-kp-on-surface-variant">
                            {r.interestLevel ? r.interestLevel.replace(/_/g, " ").toLowerCase() : "—"}
                          </td>
                          <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
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
                <h3 className="mb-2 text-sm font-semibold text-kp-on-surface-variant">Expired</h3>
                <p className="text-sm text-kp-on-surface-variant">
                  {expired.length} request{expired.length !== 1 ? "s" : ""} expired
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
