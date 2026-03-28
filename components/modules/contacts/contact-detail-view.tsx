"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useProductTier } from "@/components/ProductTierProvider";
import { ContactDetailHero } from "./contact-detail-hero";
import { ContactPrimaryInfoCard } from "./contact-primary-info-card";
import { ContactNotesCard } from "./contact-notes-card";
import { ContactActivityTimeline } from "./contact-activity-timeline";
import { ContactFollowUpsPanel } from "./contact-follow-ups-panel";
import type {
  ContactDetailActivity,
  ContactDetailContact,
} from "./contact-detail-types";

export function ContactDetailView({ id }: { id: string }) {
  const [contact, setContact] = useState<ContactDetailContact | null>(null);
  const [activities, setActivities] = useState<ContactDetailActivity[]>([]);
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
                contactTags: [...(prev.contactTags || []), { tag: json.data }],
              }
            : null
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
            activityType:
              commChannel === "CALL" ? "CALL_LOGGED" : "EMAIL_LOGGED",
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
          // optional
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed")
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const nextReminder = useMemo(() => {
    const list = contact?.followUpReminders ?? [];
    return list.length ? list[0] : null;
  }, [contact?.followUpReminders]);

  if (loading) return <PageLoading message="Loading contact…" />;
  if (error || !contact)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  const reminders = contact.followUpReminders ?? [];
  const isAssignedToMe = contact.assignedToUserId === currentUserId;

  return (
    <div className="flex flex-col gap-6">
      <ContactDetailHero
        fullName={fullName}
        status={contact.status}
        hasCrmAccess={hasCrmAccess}
        onStatusChange={updateStatus}
        activities={activities}
        nextReminder={nextReminder}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:items-start">
        <div className="min-w-0">
          <ContactActivityTimeline
            activities={activities}
            hasCrmAccess={hasCrmAccess}
            noteBody={noteBody}
            addingNote={addingNote}
            onNoteBodyChange={setNoteBody}
            onAddNote={addNote}
            commChannel={commChannel}
            onCommChannelChange={setCommChannel}
            commBody={commBody}
            onCommBodyChange={setCommBody}
            loggingComm={loggingComm}
            onLogCommunication={logCommunication}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:max-w-[340px] lg:justify-self-end">
          <ContactPrimaryInfoCard
            contact={contact}
            hasCrmAccess={hasCrmAccess}
            currentUserId={currentUserId}
            isAssignedToMe={isAssignedToMe}
            tagName={tagName}
            addingTag={addingTag}
            onTagNameChange={setTagName}
            onAddTag={addTag}
            onRemoveTag={removeTag}
            onAssignToMe={assignToMe}
            onUnassign={unassign}
          />
          <ContactNotesCard notes={contact.notes} />
          {hasCrmAccess ? (
            <ContactFollowUpsPanel
              reminders={reminders}
              reminderDue={reminderDue}
              reminderBody={reminderBody}
              addingReminder={addingReminder}
              onReminderDueChange={setReminderDue}
              onReminderBodyChange={setReminderBody}
              onAddReminder={addReminder}
              onReminderDone={(rid) => updateReminderStatus(rid, "DONE")}
              onReminderDismiss={(rid) =>
                updateReminderStatus(rid, "DISMISSED")
              }
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
