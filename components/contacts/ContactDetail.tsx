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
import { useProductTier } from "@/components/ProductTierProvider";

const CONTACT_STATUSES = ["LEAD", "CONTACTED", "NURTURING", "READY", "LOST"] as const;

type Tag = { id: string; name: string };
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
  contactTags?: { tag: Tag }[];
  followUpReminders?: Reminder[];
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

  const assignToMe = useCallback(() => {
    if (!contact || !currentUserId) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: currentUserId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setContact(json.data);
      })
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
      .then((json) => {
        if (!json.error) setContact(json.data);
      })
      .catch(() => {});
  }, [id, contact]);

  const updateStatus = useCallback(
    (status: string) => {
      if (!contact) return;
      fetch(`/api/v1/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status || null }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (!json.error) setContact(json.data);
        })
        .catch(() => {});
    },
    [id, contact]
  );

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
          prev
            ? {
                ...prev,
                contactTags: [
                  ...(prev.contactTags || []),
                  { tag: json.data },
                ],
              }
            : null
        );
        setTagName("");
      })
      .catch(() => {})
      .finally(() => setAddingTag(false));
  }, [id, tagName, addingTag]);

  const removeTag = useCallback(
    (tagId: string) => {
      fetch(`/api/v1/contacts/${id}/tags/${tagId}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((json) => {
          if (!json.error)
            setContact((prev) =>
              prev
                ? {
                    ...prev,
                    contactTags: (prev.contactTags || []).filter(
                      (ct) => ct.tag.id !== tagId
                    ),
                  }
                : null
            );
        })
        .catch(() => {});
    },
    [id]
  );

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
          prev
            ? {
                ...prev,
                followUpReminders: [
                  ...(prev.followUpReminders || []),
                  json.data,
                ],
              }
            : null
        );
        setReminderBody("");
        setReminderDue("");
      })
      .catch(() => {})
      .finally(() => setAddingReminder(false));
  }, [id, reminderBody, reminderDue, addingReminder]);

  const updateReminderStatus = useCallback(
    (reminderId: string, status: "DONE" | "DISMISSED") => {
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
                ? {
                    ...prev,
                    followUpReminders: (prev.followUpReminders || []).filter(
                      (r) => r.id !== reminderId
                    ),
                  }
                : null
            );
        })
        .catch(() => {});
    },
    []
  );

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
          {
            id: newActivity.id,
            activityType: "NOTE_ADDED",
            body: newActivity.body,
            occurredAt: newActivity.occurredAt,
          },
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact info</CardTitle>
              <CardDescription>Lead from {contact.source}</CardDescription>
            </div>
            {hasCrmAccess && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select
                    value={contact.status || "LEAD"}
                    onValueChange={updateStatus}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentUserId && (
                  <div className="flex items-center gap-2">
                    {contact.assignedToUserId === currentUserId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={unassign}
                      >
                        Unassign
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={assignToMe}
                      >
                        Assign to me
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
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
          {hasCrmAccess && (contact.contactTags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {(contact.contactTags || []).map((ct) => (
                <span
                  key={ct.tag.id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium"
                >
                  {ct.tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(ct.tag.id)}
                    className="ml-1 rounded hover:bg-primary/20"
                    aria-label={`Remove ${ct.tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {hasCrmAccess && (
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Add tag..."
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="flex-1"
              />
              <Button size="sm" onClick={addTag} disabled={!tagName.trim() || addingTag}>
                {addingTag ? "Adding..." : "Add"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {hasCrmAccess && (contact.followUpReminders?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reminders</CardTitle>
            <CardDescription>Upcoming follow-ups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(contact.followUpReminders || []).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded border p-2"
              >
                <div>
                  <p className="text-sm font-medium">{r.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.dueAt)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateReminderStatus(r.id, "DONE")}
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateReminderStatus(r.id, "DISMISSED")}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hasCrmAccess && (
        <Card>
          <CardHeader>
            <CardTitle>Add reminder</CardTitle>
            <CardDescription>Schedule a follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="datetime-local"
              value={reminderDue}
              onChange={(e) => setReminderDue(e.target.value)}
            />
            <Textarea
              placeholder="What to follow up on..."
              value={reminderBody}
              onChange={(e) => setReminderBody(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button
              size="sm"
              onClick={addReminder}
              disabled={!reminderBody.trim() || !reminderDue || addingReminder}
            >
              {addingReminder ? "Adding..." : "Add reminder"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Timeline of events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCrmAccess && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note..."
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <Button
                size="sm"
                onClick={addNote}
                disabled={!noteBody.trim() || addingNote}
              >
                {addingNote ? "Adding..." : "Add note"}
              </Button>
            </div>
          )}
          {hasCrmAccess && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Log call or email</p>
            <Select value={commChannel} onValueChange={(v) => setCommChannel(v as "CALL" | "EMAIL")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CALL">Call</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder={`What was discussed in the ${commChannel.toLowerCase()}...`}
              value={commBody}
              onChange={(e) => setCommBody(e.target.value)}
              rows={2}
              className="resize-none"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={logCommunication}
              disabled={!commBody.trim() || loggingComm}
            >
              {loggingComm ? "Logging..." : `Log ${commChannel.toLowerCase()}`}
            </Button>
          </div>
          )}
          {activities.length === 0 ? (
            <p className="text-muted-foreground py-4">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-muted-foreground shrink-0 w-36">
                    {formatDate(a.occurredAt)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {a.activityType && (
                      <span className="inline-block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                        {a.activityType === "EMAIL_SENT"
                          ? "Email sent"
                          : a.activityType === "NOTE_ADDED"
                            ? "Note"
                            : a.activityType === "VISITOR_SIGNED_IN"
                              ? "Sign-in"
                              : a.activityType === "CALL_LOGGED"
                                ? "Call"
                                : a.activityType === "EMAIL_LOGGED"
                                  ? "Email"
                                  : a.activityType.replace(/_/g, " ").toLowerCase()}
                      </span>
                    )}
                    <p className="text-sm">{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
