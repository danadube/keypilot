"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { QrCode, Users, FileText, ExternalLink, Copy } from "lucide-react";
import { HOST_FEEDBACK_TAGS, TRAFFIC_LEVELS } from "@/lib/validations/open-house";
import { VisitorRow } from "./VisitorRow";
import { SignInFormFields } from "@/components/oh/SignInFormFields";

type HostData = {
  invite: { id: string; email: string; role: string; expiresAt: string };
  openHouse: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    status: string;
    qrSlug: string;
    trafficLevel: string | null;
    feedbackTags: unknown;
    hostNotes: string | null;
    property: { address1: string; city: string; state: string };
    visitors: Array<{
      id: string;
      submittedAt: string;
      leadStatus: string | null;
      signInMethod: string;
      visitorNotes?: string | null;
      visitorTags?: string[] | null;
      contact: { firstName: string; lastName: string; email: string | null; phone: string | null };
    }>;
  };
  qrCodeDataUrl: string;
  signInUrl: string | null;
};

const TRAFFIC_LABELS: Record<string, string> = {
  LOW: "Low",
  MODERATE: "Moderate",
  HIGH: "High",
  VERY_HIGH: "Very high",
};

const TAG_LABELS: Record<string, string> = {
  "price high": "Price high",
  "kitchen dated": "Kitchen dated",
  "layout liked": "Layout liked",
  "backyard liked": "Backyard liked",
  "location concern": "Location concern",
};

export default function HostDashboardPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<HostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<string | null>(null);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [hostNotes, setHostNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchData = () =>
    fetch(`/api/v1/host/invite/${token}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          setData(json.data);
          const oh = json.data?.openHouse;
          if (oh) {
            setTrafficLevel(oh.trafficLevel ?? null);
            setFeedbackTags(Array.isArray(oh.feedbackTags) ? [...oh.feedbackTags] : []);
            setHostNotes(oh.hostNotes ?? "");
          }
        }
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (token) {
      setLoading(true);
      setError(null);
      fetchData();
    }
  }, [token]);

  const toggleTag = (tag: string) => {
    setFeedbackTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/host/invite/${token}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trafficLevel: trafficLevel ?? null,
          feedbackTags,
          hostNotes: hostNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = (url: string) => async () => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  if (loading) return <PageLoading message="Loading host dashboard..." />;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorMessage
          message={error || "Not found"}
          onRetry={() => {
            setError(null);
            setLoading(true);
            fetchData();
          }}
        />
      </div>
    );
  }

  const oh = data.openHouse;
  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-xl font-semibold text-slate-900">Host Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {oh.property.address1}, {oh.property.city}, {oh.property.state}
          </p>
          <p className="text-sm text-slate-500">
            {formatDate(oh.startAt)} · {formatTime(oh.startAt)} – {formatTime(oh.endAt)}
          </p>
          <Badge variant={oh.status === "ACTIVE" ? "default" : "secondary"} className="mt-2">
            {oh.status}
          </Badge>
        </header>

        {/* Large QR + Sign-in link + inline check-in form (host page) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="h-5 w-5" />
              Visitor sign-in
            </CardTitle>
            <CardDescription>
              Share the QR code or link so visitors can check in on their phone, or check someone in here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-4">
              {data.qrCodeDataUrl && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.qrCodeDataUrl}
                    alt="QR Code for visitor sign-in"
                    width={220}
                    height={220}
                  />
                </div>
              )}
              {data.signInUrl && (
                <div className="flex w-full max-w-sm flex-col items-center gap-2">
                  <p className="text-xs font-medium text-slate-500">Sign-in link</p>
                  <p className="break-all text-center font-mono text-sm text-slate-600">
                    {data.signInUrl}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink(data.signInUrl)}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {linkCopied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="default" size="sm" asChild>
                      <a
                        href={data.signInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 pt-4">
              <p className="mb-3 text-sm font-medium text-slate-700">Check in here (e.g. walk-in)</p>
              <SignInFormFields
                openHouse={{
                  id: oh.id,
                  title: oh.title,
                  startAt: oh.startAt,
                  endAt: oh.endAt,
                  property: {
                    ...oh.property,
                    zip: (oh.property as { zip?: string }).zip ?? "",
                  },
                }}
                signInMethod="TABLET"
                compact
                onSuccess={fetchData}
              />
            </div>
          </CardContent>
        </Card>

        {/* Visitor list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Visitors ({oh.visitors.length})
            </CardTitle>
            <CardDescription>People who have checked in</CardDescription>
          </CardHeader>
          <CardContent>
            {oh.visitors.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No visitors yet. Share the sign-in link to get started.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Time</th>
                      <th className="pb-2 pr-4">Contact</th>
                      <th className="pb-2 pr-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oh.visitors.map((v) => (
                      <VisitorRow
                        key={v.id}
                        visitor={v}
                        token={token}
                        formatTime={formatTime}
                        onSaved={fetchData}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Host feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Host feedback
            </CardTitle>
            <CardDescription>
              Traffic level, feedback tags, and quick notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveFeedback} className="space-y-4">
              <div className="space-y-2">
                <Label>Traffic level</Label>
                <Select
                  value={trafficLevel ?? ""}
                  onValueChange={(v) => setTrafficLevel(v || null)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select traffic level" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAFFIC_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {TRAFFIC_LABELS[level] ?? level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Feedback tags</Label>
                <div className="flex flex-wrap gap-3">
                  {HOST_FEEDBACK_TAGS.map((tag) => (
                    <label
                      key={tag}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={feedbackTags.includes(tag)}
                        onChange={() => toggleTag(tag)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {TAG_LABELS[tag] ?? tag}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostNotes">Quick notes</Label>
                <Textarea
                  id="hostNotes"
                  value={hostNotes}
                  onChange={(e) => setHostNotes(e.target.value)}
                  placeholder="Notes about the open house..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Powered by KeyPilot ·{" "}
          <Link href="/" className="hover:underline">
            KeyPilot
          </Link>
        </p>
      </div>
    </div>
  );
}
