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
import { ContactMailingAddressCard } from "./contact-mailing-address-card";
import { ContactFarmMembershipsPanel } from "./contact-farm-memberships-panel";
import type {
  ContactDetailActivity,
  ContactDetailContact,
  FarmAreaOption,
  FarmMembership,
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
  const [farmAreas, setFarmAreas] = useState<FarmAreaOption[]>([]);
  const [farmMemberships, setFarmMemberships] = useState<FarmMembership[]>([]);
  const [selectedFarmAreaId, setSelectedFarmAreaId] = useState("");
  const [addingFarmMembership, setAddingFarmMembership] = useState(false);
  const [farmMembershipError, setFarmMembershipError] = useState<string | null>(
    null
  );
  const [commChannel, setCommChannel] = useState<"CALL" | "EMAIL">("CALL");
  const [commBody, setCommBody] = useState("");
  const [loggingComm, setLoggingComm] = useState(false);
  const [patchingReminderId, setPatchingReminderId] = useState<string | null>(
    null
  );
  const [mailStreet1, setMailStreet1] = useState("");
  const [mailStreet2, setMailStreet2] = useState("");
  const [mailCity, setMailCity] = useState("");
  const [mailState, setMailState] = useState("");
  const [mailZip, setMailZip] = useState("");
  const [savingMailing, setSavingMailing] = useState(false);
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

  const addFarmMembership = useCallback(() => {
    if (!selectedFarmAreaId || addingFarmMembership) return;
    setAddingFarmMembership(true);
    setFarmMembershipError(null);
    fetch(`/api/v1/contacts/${id}/farm-memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmAreaId: selectedFarmAreaId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        const created = json.data as FarmMembership;
        setFarmMemberships((prev) => {
          const withoutExisting = prev.filter((m) => m.id !== created.id);
          return [...withoutExisting, created].sort((a, b) =>
            `${a.farmArea.territory.name} ${a.farmArea.name}`.localeCompare(
              `${b.farmArea.territory.name} ${b.farmArea.name}`
            )
          );
        });
        setSelectedFarmAreaId("");
      })
      .catch((err) =>
        setFarmMembershipError(
          err instanceof Error ? err.message : "Failed to add membership"
        )
      )
      .finally(() => setAddingFarmMembership(false));
  }, [id, selectedFarmAreaId, addingFarmMembership]);

  const archiveFarmMembership = useCallback(
    (membershipId: string) => {
      fetch(`/api/v1/contacts/${id}/farm-memberships/${membershipId}`, {
        method: "DELETE",
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          setFarmMemberships((prev) => prev.filter((m) => m.id !== membershipId));
        })
        .catch((err) =>
          setFarmMembershipError(
            err instanceof Error ? err.message : "Failed to archive membership"
          )
        );
    },
    [id]
  );

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
    const baseRequests = [
      fetch(`/api/v1/contacts/${id}`),
      fetch(`/api/v1/contacts/${id}/activities`),
      fetch("/api/v1/me"),
    ];
    const crmRequests = hasCrmAccess
      ? [
          fetch(`/api/v1/contacts/${id}/farm-memberships`),
          fetch("/api/v1/farm-areas"),
        ]
      : [];

    Promise.all([...baseRequests, ...crmRequests])
      .then(async (responses) => {
        const [cRes, aRes, meRes, membershipsRes, farmAreasRes] = responses;
        const cJson = await cRes.json();
        const aJson = await aRes.json();
        if (cJson.error) throw new Error(cJson.error.message);
        setContact(cJson.data);
        setActivities(aJson.data || []);
        if (hasCrmAccess && membershipsRes && farmAreasRes) {
          const membershipsJson = await membershipsRes.json();
          const farmAreasJson = await farmAreasRes.json();
          if (membershipsJson.error) {
            throw new Error(membershipsJson.error.message);
          }
          if (farmAreasJson.error) {
            throw new Error(farmAreasJson.error.message);
          }
          setFarmMemberships(membershipsJson.data || []);
          setFarmAreas(farmAreasJson.data || []);
          setFarmMembershipError(null);
        } else {
          setFarmMemberships([]);
          setFarmAreas([]);
          setFarmMembershipError(null);
        }
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
  }, [id, hasCrmAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!contact) return;
    setMailStreet1(contact.mailingStreet1 ?? "");
    setMailStreet2(contact.mailingStreet2 ?? "");
    setMailCity(contact.mailingCity ?? "");
    setMailState(contact.mailingState ?? "");
    setMailZip(contact.mailingZip ?? "");
  }, [contact]);

  const saveMailingAddress = useCallback(() => {
    if (!contact || savingMailing) return;
    setSavingMailing(true);
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mailingStreet1: mailStreet1.trim() || null,
        mailingStreet2: mailStreet2.trim() || null,
        mailingCity: mailCity.trim() || null,
        mailingState: mailState.trim() || null,
        mailingZip: mailZip.trim() || null,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setContact(json.data);
      })
      .catch(() => {})
      .finally(() => setSavingMailing(false));
  }, [
    contact,
    id,
    mailStreet1,
    mailStreet2,
    mailCity,
    mailState,
    mailZip,
    savingMailing,
  ]);

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
  }, [loading, contact]);

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
          <ContactMailingAddressCard
            street1={mailStreet1}
            street2={mailStreet2}
            city={mailCity}
            state={mailState}
            zip={mailZip}
            saving={savingMailing}
            onStreet1Change={setMailStreet1}
            onStreet2Change={setMailStreet2}
            onCityChange={setMailCity}
            onStateChange={setMailState}
            onZipChange={setMailZip}
            onSave={saveMailingAddress}
          />
          {hasCrmAccess ? (
            <ContactFarmMembershipsPanel
              memberships={farmMemberships}
              farmAreas={farmAreas}
              selectedFarmAreaId={selectedFarmAreaId}
              addingFarmMembership={addingFarmMembership}
              farmMembershipError={farmMembershipError}
              onSelectedFarmAreaIdChange={setSelectedFarmAreaId}
              onAddFarmMembership={addFarmMembership}
              onArchiveFarmMembership={archiveFarmMembership}
            />
          ) : null}
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
