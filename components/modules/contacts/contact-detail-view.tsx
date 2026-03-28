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
  const [patchingReminderId, setPatchingReminderId] = useState<string | null>(
    null
  );
  const { hasCrm: hasCrmAccess } = useProductTier();

  const refreshActivities = useCallback(() => {
    return fetch(`/api/v1/contacts/${id}/activities`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setActivities(json.data || []);
      })
      .catch(() => {});
  }, [id]);

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
        setContact((prev) => {
          if (!prev) return null;
          const merged = [
            ...(prev.followUpReminders || []),
            json.data,
          ].sort(
            (a, b) =>
              new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
          );
          return { ...prev, followUpReminders: merged };
        });
        setReminderBody("");
        setReminderDue("");
      })
      .catch(() => {})
      .finally(() => setAddingReminder(false));
  }, [id, reminderBody, reminderDue, addingReminder]);

  const updateReminderStatus = useCallback(
    (reminderId: string, status: "DONE" | "DISMISSED") => {
      setPatchingReminderId(reminderId);
      fetch(`/api/v1/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (!json.error) {
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
            void refreshActivities();
          }
        })
        .catch(() => {})
        .finally(() => setPatchingReminderId(null));
    },
    [refreshActivities]
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
        setCommBody("");
        void refreshActivities();
      })
      .catch(() => setError("Failed to log"))
      .finally(() => setLoggingComm(false));
  }, [id, commChannel, commBody, loggingComm, refreshActivities]);

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
        setNoteBody("");
        void refreshActivities();
      })
      .catch(() => setError("Failed to add note"))
      .finally(() => setAddingNote(false));
  }, [id, noteBody, addingNote, refreshActivities]);

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

  /** Open schedule panel when linked from Contacts list (`#schedule-follow-up`). */
  useEffect(() => {
    if (loading || !contact || typeof window === "undefined") return;
    if (window.location.hash !== "#schedule-follow-up") return;
    const t = window.setTimeout(() => {
      const el = document.getElementById("schedule-follow-up");
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [loading, contact?.id]);

  const nextReminder = useMemo(() => {
    const list = contact?.followUpReminders ?? [];
    return list.length ? list[0] : null;
  }, [contact?.followUpReminders]);

  const markNextReminderDone = useCallback(() => {
    const r = nextReminder;
    if (!r) return;
    updateReminderStatus(r.id, "DONE");
  }, [nextReminder, updateReminderStatus]);

  if (loading) return <PageLoading message="Loading contact…" />;
  if (error || !contact)
    return <ErrorMessage message={error || "Not found"} onRetry={loadData} />;

  const fullName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  const reminders = contact.followUpReminders ?? [];
  const isAssignedToMe = contact.assignedToUserId === currentUserId;
  const markingHeroReminder =
    !!nextReminder && patchingReminderId === nextReminder.id;

  return (
    <div className="flex flex-col gap-6">
      <ContactDetailHero
        fullName={fullName}
        status={contact.status}
        hasCrmAccess={hasCrmAccess}
        onStatusChange={updateStatus}
        activities={activities}
        nextReminder={nextReminder}
        onMarkNextReminderDone={markNextReminderDone}
        markingReminder={markingHeroReminder}
        reminderDue={reminderDue}
        reminderBody={reminderBody}
        onReminderDueChange={setReminderDue}
        onReminderBodyChange={setReminderBody}
        onAddReminder={addReminder}
        addingReminder={addingReminder}
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
              patchingReminderId={patchingReminderId}
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
