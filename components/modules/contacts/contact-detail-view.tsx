"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { StatusBadge } from "@/components/ui/status-badge";
import { useProductTier } from "@/components/ProductTierProvider";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSave,
  kpBtnSecondary,
  kpBtnTertiary,
} from "@/components/ui/kp-dashboard-button-tiers";
import {
  ArrowLeft,
  Bell,
  Check,
  Phone,
  Mail,
  Tag,
  User,
  Clock,
  MessageSquare,
  FileText,
  X,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTACT_STATUSES = ["LEAD", "CONTACTED", "NURTURING", "READY", "LOST"] as const;

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactTag = { id: string; name: string };
type Reminder = { id: string; dueAt: string; body: string; status: string };

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
  status?: string | null;
  assignedToUserId?: string | null;
  contactTags?: { tag: ContactTag }[];
  followUpReminders?: Reminder[];
};

type Activity = {
  id: string;
  activityType: string;
  body: string;
  occurredAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeVariant(
  s: string | null | undefined
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (s) {
    case "LEAD":      return "pending";
    case "CONTACTED": return "upcoming";
    case "NURTURING": return "active";
    case "READY":     return "sold";
    case "LOST":      return "cancelled";
    default:          return "pending";
  }
}

function activityLabel(type: string): { label: string; colorClass: string } {
  switch (type) {
    case "EMAIL_SENT":       return { label: "Email sent",  colorClass: "text-kp-teal" };
    case "NOTE_ADDED":       return { label: "Note",        colorClass: "text-kp-on-surface-variant" };
    case "VISITOR_SIGNED_IN":return { label: "Sign-in",     colorClass: "text-emerald-400" };
    case "CALL_LOGGED":      return { label: "Call",        colorClass: "text-kp-gold" };
    case "EMAIL_LOGGED":     return { label: "Email",       colorClass: "text-kp-teal" };
    default:                 return { label: type.replace(/_/g, " ").toLowerCase(), colorClass: "text-kp-on-surface-variant" };
  }
}

const formatDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDue = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-24 shrink-0 text-xs font-medium text-kp-on-surface-variant">{label}</span>
      <span className="text-sm text-kp-on-surface">{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ContactDetailView({ id }: { id: string }) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tagName, setTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [reminderBody, setReminderBody] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);
  const [commChannel, setCommChannel] = useState<"CALL" | "EMAIL">("CALL");
  const [commBody, setCommBody] = useState("");
  const [loggingComm, setLoggingComm] = useState(false);
  const { hasCrm: hasCrmAccess } = useProductTier();

  // ── Handlers (all logic preserved exactly) ──────────────────────────────────

  const assignToMe = useCallback(() => {
    if (!contact || !currentUserId) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: currentUserId }),
    })
      .then((res) => res.json())
      .then((json) => { if (!json.error) setContact(json.data); })
      .catch(() => {});
  }, [id, contact, currentUserId]);

  const unassign = useCallback(() => {
    if (!contact) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: null }),
    })
      .then((res) => res.json())
      .then((json) => { if (!json.error) setContact(json.data); })
      .catch(() => {});
  }, [id, contact]);

  const updateStatus = useCallback((status: string) => {
    if (!contact) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status || null }),
    })
      .then((res) => res.json())
      .then((json) => { if (!json.error) setContact(json.data); })
      .catch(() => {});
  }, [id, contact]);

  const addTag = useCallback(() => {
    const name = tagName.trim();
    if (!name || addingTag) return;
    setAddingTag(true);
    fetch(`/api/v1/contacts/${id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName: name }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setContact((prev) =>
          prev ? { ...prev, contactTags: [...(prev.contactTags || []), { tag: json.data }] } : null
        );
        setTagName("");
      })
      .catch(() => {})
      .finally(() => setAddingTag(false));
  }, [id, tagName, addingTag]);

  const removeTag = useCallback((tagId: string) => {
    fetch(`/api/v1/contacts/${id}/tags/${tagId}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error)
          setContact((prev) =>
            prev
              ? { ...prev, contactTags: (prev.contactTags || []).filter((ct) => ct.tag.id !== tagId) }
              : null
          );
      })
      .catch(() => {});
  }, [id]);

  const addReminder = useCallback(() => {
    const body = reminderBody.trim();
    const dueAt = reminderDue;
    if (!body || !dueAt || addingReminder) return;
    setAddingReminder(true);
    fetch(`/api/v1/contacts/${id}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, dueAt: new Date(dueAt).toISOString() }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setContact((prev) =>
          prev ? { ...prev, followUpReminders: [...(prev.followUpReminders || []), json.data] } : null
        );
        setReminderBody("");
        setReminderDue("");
      })
      .catch(() => {})
      .finally(() => setAddingReminder(false));
  }, [id, reminderBody, reminderDue, addingReminder]);

  const updateReminderStatus = useCallback((reminderId: string, status: "DONE" | "DISMISSED") => {
    fetch(`/api/v1/reminders/${reminderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error)
          setContact((prev) =>
            prev
              ? { ...prev, followUpReminders: (prev.followUpReminders || []).filter((r) => r.id !== reminderId) }
              : null
          );
      })
      .catch(() => {});
  }, []);

  const logCommunication = useCallback(() => {
    const body = commBody.trim();
    if (!body || loggingComm) return;
    setLoggingComm(true);
    fetch(`/api/v1/contacts/${id}/communications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: commChannel, body }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setActivities((prev) => [
          {
            id: json.data.id,
            activityType: commChannel === "CALL" ? "CALL_LOGGED" : "EMAIL_LOGGED",
            body: json.data.body,
            occurredAt: json.data.occurredAt,
          },
          ...prev,
        ]);
        setCommBody("");
      })
      .catch(() => setError("Failed to log"))
      .finally(() => setLoggingComm(false));
  }, [id, commChannel, commBody, loggingComm]);

  const addNote = useCallback(() => {
    const body = noteBody.trim();
    if (!body || addingNote) return;
    setAddingNote(true);
    fetch(`/api/v1/contacts/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        const newActivity = json.data;
        setActivities((prev) => [
          { id: newActivity.id, activityType: "NOTE_ADDED", body: newActivity.body, occurredAt: newActivity.occurredAt },
          ...prev,
        ]);
        setNoteBody("");
      })
      .catch(() => setError("Failed to add note"))
      .finally(() => setAddingNote(false));
  }, [id, noteBody, addingNote]);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/contacts/${id}`),
      fetch(`/api/v1/contacts/${id}/activities`),
      fetch("/api/v1/me"),
    ])
      .then(async ([cRes, aRes, meRes]) => {
        const cJson = await cRes.json();
        const aJson = await aRes.json();
        if (cJson.error) throw new Error(cJson.error.message);
        setContact(cJson.data);
        setActivities(aJson.data || []);
        try {
          const meJson = await meRes.json();
          if (meJson.data?.id) setCurrentUserId(meJson.data.id);
        } catch {
          // me endpoint optional for assign UI
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <PageLoading message="Loading contact…" />;
  if (error || !contact)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const reminders = contact.followUpReminders ?? [];
  const tags = contact.contactTags ?? [];
  const isAssignedToMe = contact.assignedToUserId === currentUserId;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
          asChild
        >
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
            Contacts
          </Link>
        </Button>
        <span className="text-kp-outline">/</span>
        <h1 className="text-xl font-bold text-kp-on-surface">{fullName || "—"}</h1>
        {contact.status && (
          <StatusBadge variant={statusBadgeVariant(contact.status)}>
            {contact.status.charAt(0) + contact.status.slice(1).toLowerCase()}
          </StatusBadge>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

        {/* ── LEFT: Identity + Tags + Reminders ───────────────────────────────── */}
        <div className="space-y-4">

          {/* Contact info card */}
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-kp-on-surface">Contact info</h2>
                <p className="mt-0.5 text-xs text-kp-on-surface-variant">Lead from {contact.source}</p>
              </div>
              {hasCrmAccess && currentUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSecondary, "h-7 shrink-0 text-xs")}
                  onClick={isAssignedToMe ? unassign : assignToMe}
                >
                  <User className="mr-1.5 h-3 w-3" />
                  {isAssignedToMe ? "Unassign" : "Assign to me"}
                </Button>
              )}
            </div>

            {/* Status selector */}
            {hasCrmAccess && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-medium text-kp-on-surface-variant">Status</span>
                <Select value={contact.status || "LEAD"} onValueChange={updateStatus}>
                  <SelectTrigger className="h-8 w-[140px] border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                    {CONTACT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="hover:bg-kp-surface-high">
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Info fields */}
            <div className="space-y-2.5">
              <InfoRow
                label="Email"
                value={
                  contact.email ? (
                    <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-1 text-kp-teal hover:underline">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </a>
                  ) : (
                    <span className="text-kp-on-surface-variant">—</span>
                  )
                }
              />
              <InfoRow
                label="Phone"
                value={
                  contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-1 text-kp-teal hover:underline">
                      <Phone className="h-3 w-3" />
                      {contact.phone}
                    </a>
                  ) : (
                    <span className="text-kp-on-surface-variant">—</span>
                  )
                }
              />
              {contact.hasAgent != null && (
                <InfoRow label="Has agent" value={contact.hasAgent ? "Yes" : "No"} />
              )}
              {contact.timeline && (
                <InfoRow label="Timeline" value={contact.timeline} />
              )}
              {contact.notes && (
                <InfoRow label="Notes" value={contact.notes} />
              )}
            </div>
          </div>

          {/* Tags */}
          {hasCrmAccess && (
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                <h2 className="text-sm font-semibold text-kp-on-surface">Tags</h2>
              </div>
              {tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {tags.map((ct) => (
                    <span
                      key={ct.tag.id}
                      className="inline-flex items-center gap-1 rounded-full bg-kp-teal/15 px-2.5 py-0.5 text-xs font-medium text-kp-teal"
                    >
                      {ct.tag.name}
                      <button
                        type="button"
                        onClick={() => removeTag(ct.tag.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-kp-teal/20"
                        aria-label={`Remove ${ct.tag.name}`}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  className="h-8 flex-1 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:ring-kp-teal"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
                  onClick={addTag}
                  disabled={!tagName.trim() || addingTag}
                >
                  {addingTag ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          )}

          {/* Reminders */}
          {hasCrmAccess && (
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                <h2 className="text-sm font-semibold text-kp-on-surface">Reminders</h2>
              </div>

              {reminders.length > 0 && (
                <ul className="mb-4 space-y-2">
                  {reminders.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-kp-outline bg-kp-surface-high p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-kp-on-surface">{r.body}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-kp-on-surface-variant">
                          <Clock className="h-3 w-3" />
                          {formatDue(r.dueAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(kpBtnTertiary, "h-6 px-2 text-xs text-kp-teal hover:bg-kp-teal/10 hover:text-kp-teal")}
                          onClick={() => updateReminderStatus(r.id, "DONE")}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(kpBtnTertiary, "h-6 px-2 text-xs")}
                          onClick={() => updateReminderStatus(r.id, "DISMISSED")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add reminder form */}
              <div className="space-y-2 border-t border-kp-outline pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-kp-on-surface-variant">
                  Schedule reminder
                </p>
                <Input
                  type="datetime-local"
                  value={reminderDue}
                  onChange={(e) => setReminderDue(e.target.value)}
                  className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface focus-visible:ring-kp-teal [color-scheme:dark]"
                />
                <Textarea
                  placeholder="What to follow up on..."
                  value={reminderBody}
                  onChange={(e) => setReminderBody(e.target.value)}
                  rows={2}
                  className="resize-none border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:ring-kp-teal"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(kpBtnSave, "h-8 border-transparent px-3 text-xs")}
                  onClick={addReminder}
                  disabled={!reminderBody.trim() || !reminderDue || addingReminder}
                >
                  {addingReminder ? "Adding…" : "Add reminder"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Activity feed ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-kp-on-surface">Activity</h2>

          {/* Add note */}
          {hasCrmAccess && (
            <div className="mb-4 space-y-2 rounded-lg border border-kp-outline bg-kp-surface-high p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                <span className="text-xs font-medium text-kp-on-surface">Add note</span>
              </div>
              <Textarea
                placeholder="Add a note..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                className="resize-none border-kp-outline bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:ring-kp-teal"
              />
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-7 border-transparent px-3 text-xs")}
                onClick={addNote}
                disabled={!noteBody.trim() || addingNote}
              >
                {addingNote ? "Adding…" : "Add note"}
              </Button>
            </div>
          )}

          {/* Log call / email */}
          {hasCrmAccess && (
            <div className="mb-5 space-y-2 rounded-lg border border-kp-outline bg-kp-surface-high p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-kp-on-surface-variant" />
                <span className="text-xs font-medium text-kp-on-surface">Log call or email</span>
              </div>
              <Select value={commChannel} onValueChange={(v) => setCommChannel(v as "CALL" | "EMAIL")}>
                <SelectTrigger className="h-7 w-24 border-kp-outline bg-kp-surface text-xs text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                  <SelectItem value="CALL">Call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder={`What was discussed in the ${commChannel.toLowerCase()}...`}
                value={commBody}
                onChange={(e) => setCommBody(e.target.value)}
                rows={2}
                className="resize-none border-kp-outline bg-kp-surface text-sm text-kp-on-surface placeholder:text-kp-on-surface-placeholder focus-visible:ring-kp-teal"
              />
              <Button
                size="sm"
                variant="outline"
                className={cn(kpBtnSecondary, "h-7 px-3 text-xs")}
                onClick={logCommunication}
                disabled={!commBody.trim() || loggingComm}
              >
                {loggingComm ? "Logging…" : `Log ${commChannel.toLowerCase()}`}
              </Button>
            </div>
          )}

          {/* Activity timeline */}
          {activities.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-kp-on-surface-variant">No activity yet.</p>
            </div>
          ) : (
            <ul className="space-y-0">
              {activities.map((a, i) => {
                const { label, colorClass } = activityLabel(a.activityType);
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-start gap-4 py-3",
                      i < activities.length - 1 && "border-b border-kp-outline"
                    )}
                  >
                    <span className="w-32 shrink-0 text-xs text-kp-on-surface-variant">
                      {formatDate(a.occurredAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className={cn("mb-0.5 block text-[10px] font-bold uppercase tracking-wide", colorClass)}>
                        {label}
                      </span>
                      <p className="text-sm text-kp-on-surface">{a.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
