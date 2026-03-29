"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { PageLoading } from "@/components/shared/PageLoading";
import { Mail, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";
import { useOpenHouseContextSubtitle } from "@/components/showing-hq/useOpenHouseContextSubtitle";

type FollowUpDraft = {
  id: string;
  subject: string;
  body: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string; email: string | null };
};

type AgentTaskFollowUp = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string;
  contactId: string;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };
};

// Draft status pill styles
function draftStatusClass(s: string) {
  switch (s) {
    case "SENT_MANUAL": return "bg-emerald-400/15 text-emerald-400";
    case "REVIEWED":    return "bg-kp-teal/15 text-kp-teal";
    case "DRAFT":       return "bg-kp-gold/15 text-kp-gold";
    case "ARCHIVED":    return "bg-kp-surface-high text-kp-on-surface-variant";
    default:            return "bg-kp-surface-high text-kp-on-surface-variant";
  }
}

function draftStatusLabel(s: string) {
  switch (s) {
    case "SENT_MANUAL": return "Sent";
    case "REVIEWED":    return "Reviewed";
    case "DRAFT":       return "Draft";
    case "ARCHIVED":    return "Archived";
    default:            return s;
  }
}

export function OpenHouseFollowUpsView({ openHouseId }: { openHouseId: string }) {
  const subtitle = useOpenHouseContextSubtitle(openHouseId);
  const [drafts, setDrafts] = useState<FollowUpDraft[]>([]);
  const [followUps, setFollowUps] = useState<AgentTaskFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadDrafts = () => {
    fetch(`/api/v1/open-houses/${openHouseId}/follow-ups`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          const d = json.data;
          if (Array.isArray(d)) {
            setDrafts(d);
            setFollowUps([]);
          } else {
            setDrafts(d?.drafts ?? []);
            setFollowUps(d?.followUps ?? []);
          }
        }
      })
      .catch(() => setError("Failed to load drafts"));
  };

  useEffect(() => {
    fetch(`/api/v1/open-houses/${openHouseId}/follow-ups`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          const d = json.data;
          if (Array.isArray(d)) {
            setDrafts(d);
            setFollowUps([]);
          } else {
            setDrafts(d?.drafts ?? []);
            setFollowUps(d?.followUps ?? []);
          }
        }
      })
      .catch(() => setError("Failed to load drafts"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

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
      const res = await fetch(`/api/v1/follow-up-drafts/${draftId}/send`, { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <OpenHouseSupportPageFrame
        openHouseId={openHouseId}
        contextSubtitle={subtitle}
      >
        <PageLoading message="Loading drafts..." />
      </OpenHouseSupportPageFrame>
    );
  }
  if (error) {
    return (
      <OpenHouseSupportPageFrame
        openHouseId={openHouseId}
        contextSubtitle={subtitle}
      >
        <ErrorMessage
          message={error}
          onRetry={() => {
            setError(null);
            fetch(`/api/v1/open-houses/${openHouseId}/follow-ups`)
              .then((res) => res.json())
              .then((json) => {
                if (json.error) setError(json.error.message);
                else {
                  const d = json.data;
                  if (Array.isArray(d)) {
                    setDrafts(d);
                    setFollowUps([]);
                  } else {
                    setDrafts(d?.drafts ?? []);
                    setFollowUps(d?.followUps ?? []);
                  }
                }
              })
              .catch(() => setError("Failed to load drafts"));
          }}
        />
      </OpenHouseSupportPageFrame>
    );
  }

  const pendingCount = drafts.filter((d) => d.status === "DRAFT" || d.status === "REVIEWED").length;

  return (
    <OpenHouseSupportPageFrame
      openHouseId={openHouseId}
      contextSubtitle={subtitle}
    >
      <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-kp-on-surface">Follow-ups</h1>
          {(drafts.length > 0 || followUps.length > 0) && (
            <span className="rounded-full bg-kp-surface-high px-2.5 py-0.5 text-xs font-medium text-kp-on-surface-variant">
              {followUps.filter((f) => f.status !== "CLOSED").length + drafts.length}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
          onClick={handleGenerate}
          disabled={generating}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {generating ? "Generating…" : "Generate drafts for new visitors"}
        </Button>
      </div>

      <div className="rounded-xl border border-kp-outline bg-kp-bg/80 p-5">
        <h2 className="mb-1 text-sm font-semibold text-kp-on-surface">Person follow-ups</h2>
        <p className="mb-4 text-xs text-kp-on-surface-variant">
          Global tasks tied to this event (stored once — also on ShowingHQ home when due).
        </p>
        {followUps.filter((f) => f.status !== "CLOSED").length === 0 ? (
          <p className="text-sm text-kp-on-surface-variant">No open tasks. Add from the event workspace visitor rows.</p>
        ) : (
          <ul className="space-y-2">
            {followUps
              .filter((f) => f.status !== "CLOSED")
              .map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-kp-outline bg-kp-surface p-3"
                >
                  <div>
                    <p className="font-medium text-kp-on-surface">{t.title}</p>
                    <p className="text-xs text-kp-on-surface-variant">
                      {t.contact.firstName} {t.contact.lastName} · Due{" "}
                      {new Date(t.dueAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-7 text-xs")} asChild>
                      <Link href={`/contacts/${t.contactId}`}>Contact</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(kpBtnTertiary, "h-7 text-xs")}
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/v1/follow-ups/${t.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "CLOSED" }),
                        });
                        loadDrafts();
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-kp-outline bg-kp-bg/80 px-5 py-3">
          <div>
            <p className="text-xs font-medium text-kp-on-surface-variant">Pending</p>
            <p className="text-xl font-bold text-kp-gold">{pendingCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-kp-on-surface-variant">Sent</p>
            <p className="text-xl font-bold text-emerald-400">{drafts.filter((d) => d.status === "SENT_MANUAL").length}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-kp-on-surface-variant">Total</p>
            <p className="text-xl font-bold text-kp-on-surface">{drafts.length}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-kp-outline bg-kp-bg/80 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-kp-on-surface-variant" />
          <h2 className="text-sm font-semibold text-kp-on-surface">Email drafts</h2>
        </div>
        <p className="mb-4 text-xs text-kp-on-surface-variant">
          AI-generated follow-up emails for visitors
        </p>

        {drafts.length === 0 ? (
          <div className="py-10 text-center">
            <Mail className="mx-auto mb-2 h-8 w-8 text-kp-on-surface-variant opacity-40" />
            <p className="text-sm text-kp-on-surface-variant">
              No drafts yet. Generate drafts for visitors who don&apos;t have one.
            </p>
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-kp-outline">
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Contact</th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Subject</th>
                  <th className="pb-2.5 pt-0.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">Status</th>
                  <th className="w-[120px] pb-2.5 pt-0.5 text-right text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kp-outline">
                {drafts.map((d) => (
                  <tr key={d.id} className="transition-colors hover:bg-kp-surface-high">
                    <td className="py-2.5">
                      <p className="font-medium text-kp-on-surface">
                        {d.contact.firstName} {d.contact.lastName}
                      </p>
                      {d.contact.email && (
                        <p className="text-xs text-kp-on-surface-variant">{d.contact.email}</p>
                      )}
                    </td>
                    <td className="max-w-xs truncate py-2.5 text-kp-on-surface-variant" title={d.subject}>{d.subject}</td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                          draftStatusClass(d.status)
                        )}
                      >
                        {draftStatusLabel(d.status)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {(d.status === "DRAFT" || d.status === "REVIEWED") && d.contact.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-7 text-xs")}
                            onClick={() => handleSend(d.id)}
                            disabled={sendingId === d.id}
                          >
                            {sendingId === d.id ? "Sending…" : "Send"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(kpBtnTertiary, "h-7 text-xs")}
                          asChild
                        >
                          <Link href={`/contacts/${d.contact.id}`}>View</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </OpenHouseSupportPageFrame>
  );
}
