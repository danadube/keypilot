"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandButton } from "@/components/ui/BrandButton";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { InterestBadge } from "@/components/shared/InterestBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, CheckSquare, QrCode, Copy, RefreshCw } from "lucide-react";
import { InviteHostDialog } from "@/components/open-houses/InviteHostDialog";

type OpenHouseData = {
  hostUserId?: string;
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  qrSlug: string;
  agentName: string | null;
  trafficLevel: string | null;
  feedbackTags: string[] | null;
  hostNotes: string | null;
  property: { address1: string; city: string; state: string; zip: string };
  listingAgent?: { id: string; name: string; email: string } | null;
  hostAgent?: { id: string; name: string; email: string } | null;
  visitors: {
    id: string;
    leadStatus: string | null;
    interestLevel: string | null;
    submittedAt: string;
    contact: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
    };
  }[];
  drafts: { id: string; subject: string; status: string }[];
  _count: { visitors: number };
  draftStatusCounts: { DRAFT: number; REVIEWED: number; SENT_MANUAL: number; ARCHIVED: number };
  qrCodeDataUrl: string;
};

export default function ShowingHQOpenHouseDetailPage() {
  const params = useParams();
  const openHouseId = params.openHouseId as string;
  const [data, setData] = useState<OpenHouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load open house"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const address = data?.property
    ? [data.property.address1, data.property.city, data.property.state, data.property.zip]
        .filter(Boolean)
        .join(", ")
    : "";

  const signInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/oh/${data?.qrSlug ?? ""}`
      : "";

  const handleCopyLink = () => {
    if (!signInUrl) return;
    navigator.clipboard.writeText(signInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateQr = async () => {
    if (!openHouseId) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}/regenerate-qr`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const totalVisitors = data?._count?.visitors ?? 0;
  const contactsCaptured = data?.visitors?.length ?? 0;
  const followUpsCount =
    (data?.draftStatusCounts?.DRAFT ?? 0) +
    (data?.draftStatusCounts?.REVIEWED ?? 0) +
    (data?.draftStatusCounts?.SENT_MANUAL ?? 0) +
    (data?.draftStatusCounts?.ARCHIVED ?? 0);

  const fullName = (c: { firstName: string; lastName: string }) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

  if (loading) return <PageLoading message="Loading open house..." />;
  if (error || !data)
    return (
      <ErrorMessage
        message={error ?? "Open house not found"}
        onRetry={loadData}
      />
    );

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title={data.title}
        description={`${address} · ${formatDate(data.startAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <InviteHostDialog openHouseId={openHouseId} onInviteSent={loadData} />
            <BrandButton variant="secondary" asChild>
              <Link href="/showing-hq">← Dashboard</Link>
            </BrandButton>
            <BrandButton variant="secondary" asChild>
              <Link href="/open-houses">All open houses</Link>
            </BrandButton>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <BrandCard elevated padded>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-[var(--brand-primary)]" />
            <div>
              <p className="text-2xl font-semibold text-[var(--brand-text)]">
                {totalVisitors}
              </p>
              <p className="text-sm text-[var(--brand-text-muted)]">
                Total visitors
              </p>
            </div>
          </div>
        </BrandCard>
        <BrandCard elevated padded>
          <div className="flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-[var(--brand-primary)]" />
            <div>
              <p className="text-2xl font-semibold text-[var(--brand-text)]">
                {contactsCaptured}
              </p>
              <p className="text-sm text-[var(--brand-text-muted)]">
                Contacts captured
              </p>
            </div>
          </div>
        </BrandCard>
        <BrandCard elevated padded>
          <div className="flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-[var(--brand-primary)]" />
            <div>
              <p className="text-2xl font-semibold text-[var(--brand-text)]">
                {followUpsCount}
              </p>
              <p className="text-sm text-[var(--brand-text-muted)]">
                Follow-ups created
              </p>
            </div>
          </div>
        </BrandCard>
      </div>

      <div className="grid gap-[var(--space-lg)] lg:grid-cols-2">
        {/* Visitor list */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Visitors"
            description={`${data.visitors.length} sign-in${data.visitors.length !== 1 ? "s" : ""}`}
          />
          <div className="mt-4">
            {data.visitors.length === 0 ? (
              <p className="py-6 text-center text-[var(--brand-text-muted)]">
                No visitors yet. Share your sign-in link.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--brand-border)]">
                      <th className="pb-2 text-left font-semibold">Name</th>
                      <th className="pb-2 text-left font-semibold">Email</th>
                      <th className="pb-2 text-left font-semibold">Phone</th>
                      <th className="pb-2 text-left font-semibold">Interest</th>
                      <th className="pb-2 text-left font-semibold">Sign-in</th>
                      <th className="pb-2 text-left font-semibold">Status</th>
                      <th className="pb-2 w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--brand-border)]">
                    {data.visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                        <td className="py-2 font-medium">{fullName(v.contact)}</td>
                        <td className="py-2 text-[var(--brand-text-muted)]">
                          {v.contact.email ?? "—"}
                        </td>
                        <td className="py-2 text-[var(--brand-text-muted)]">
                          {v.contact.phone ?? "—"}
                        </td>
                        <td className="py-2">
                          <InterestBadge interestLevel={v.interestLevel} />
                        </td>
                        <td className="py-2 text-[var(--brand-text-muted)]">
                          {formatDateTime(v.submittedAt)}
                        </td>
                        <td className="py-2">
                          <LeadStatusBadge status={v.leadStatus} />
                        </td>
                        <td className="py-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/showing-hq/visitors/${v.id}`}>
                              Profile
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </BrandCard>

        {/* Follow-ups */}
        <BrandCard elevated padded>
          <BrandSectionHeader
            title="Follow-ups"
            description="Tasks generated from this open house"
          />
          <div className="mt-4">
            {data.drafts.length === 0 ? (
              <p className="py-6 text-center text-[var(--brand-text-muted)]">
                No follow-up drafts yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {data.drafts.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] p-3"
                  >
                    <p className="font-medium text-[var(--brand-text)]">
                      {d.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {d.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/open-houses/${openHouseId}/follow-ups`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/open-houses/${openHouseId}/follow-ups`}>
                  Manage follow-ups
                </Link>
              </Button>
            </div>
          </div>
        </BrandCard>
      </div>

      {/* QR sign-in link */}
      <BrandCard elevated padded>
        <BrandSectionHeader
          title="QR sign-in link"
          description="Share this link or scan the QR code for visitor sign-in"
        />
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {data.qrCodeDataUrl && (
            <div className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.qrCodeDataUrl}
                alt="QR Code"
                width={120}
                height={120}
                className="rounded border border-[var(--brand-border)]"
              />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <p className="break-all text-sm text-[var(--brand-text-muted)]">
              {signInUrl}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                disabled={!signInUrl}
              >
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied!" : "Copy link"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRegenerateQr}
                disabled={regenerating}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                />
                {regenerating ? "Regenerating..." : "Regenerate QR"}
              </Button>
              <Button size="sm" variant="secondary" asChild>
                <a
                  href={signInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Open sign-in page
                </a>
              </Button>
            </div>
          </div>
        </div>
      </BrandCard>
    </div>
  );
}
