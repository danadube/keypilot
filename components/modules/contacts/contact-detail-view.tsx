"use client";

import useSWR from "swr";
import { apiFetcher } from "@/lib/fetcher";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BrandSkeleton } from "@/components/ui/BrandSkeleton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useProductTier } from "@/components/ProductTierProvider";
import { ContactDetailIdentityColumn } from "./contact-detail-identity-column";
import { ContactDetailActionsMenu } from "./contact-detail-actions-menu";
import { ContactBusinessContextRail } from "./contact-business-context-rail";
import { ContactNotesCard } from "./contact-notes-card";
import { ContactActivityTimeline } from "./contact-activity-timeline";
import { ContactFollowUpsPanel } from "./contact-follow-ups-panel";
import { ContactMailingAddressCard } from "./contact-mailing-address-card";
import { ContactSiteAddressCard } from "./contact-site-address-card";
import { ContactFarmMembershipsPanel } from "./contact-farm-memberships-panel";
import { ContactTasksPanel } from "./contact-tasks-panel";
import { entityDetailWorkspaceGridClassName } from "@/components/layout/entity-detail-workspace-grid";
import { useClientKeepChrome } from "@/components/modules/client-keep/client-keep-chrome-context";
import type {
  ContactDetailActivity,
  ContactDetailContact,
  FarmAreaOption,
  FarmMembership,
} from "./contact-detail-types";

function LoadingState() {
  return (
    <div className={entityDetailWorkspaceGridClassName}>
      <BrandSkeleton className="h-[420px] w-full rounded-xl lg:sticky lg:top-4" />
      <div className="flex min-h-[320px] flex-col gap-4">
        <BrandSkeleton className="h-10 w-full rounded-lg" />
        <BrandSkeleton className="min-h-[240px] flex-1 rounded-xl" />
      </div>
      <div className="flex flex-col gap-4">
        <BrandSkeleton className="h-36 w-full rounded-xl" />
        <BrandSkeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ContactDetailView({ id }: { id: string }) {
  const { hasCrm: hasCrmAccess } = useProductTier();
  const { setContactDetailActions } = useClientKeepChrome();

  const {
    data: contact,
    error: contactError,
    isLoading: contactLoading,
    mutate: reloadContact,
  } = useSWR<ContactDetailContact>(id ? `/api/v1/contacts/${id}` : null, apiFetcher, {
    errorRetryCount: 2,
    errorRetryInterval: 500,
  });
  const { data: activities = [], mutate: reloadActivities } = useSWR<ContactDetailActivity[]>(
    id ? `/api/v1/contacts/${id}/activities` : null,
    apiFetcher
  );
  const { data: me } = useSWR<{ id: string }>("/api/v1/me", apiFetcher);
  const { data: farmMemberships = [], mutate: reloadFarmMemberships } = useSWR<FarmMembership[]>(
    hasCrmAccess && id ? `/api/v1/contacts/${id}/farm-memberships` : null,
    apiFetcher
  );
  const { data: farmAreas = [] } = useSWR<FarmAreaOption[]>(
    hasCrmAccess ? "/api/v1/farm-areas" : null,
    apiFetcher
  );

  const loading = contactLoading && !contact;
  const error =
    contactError instanceof Error ? contactError.message : contactError ? String(contactError) : null;
  const currentUserId = me?.id ?? null;

  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [tagName, setTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [reminderBody, setReminderBody] = useState("");
  const [reminderDue, setReminderDue] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);
  const [selectedFarmAreaId, setSelectedFarmAreaId] = useState("");
  const [addingFarmMembership, setAddingFarmMembership] = useState(false);

  const [patchingReminderId, setPatchingReminderId] = useState<string | null>(null);
  const [mailStreet1, setMailStreet1] = useState("");
  const [mailStreet2, setMailStreet2] = useState("");
  const [mailCity, setMailCity] = useState("");
  const [mailState, setMailState] = useState("");
  const [mailZip, setMailZip] = useState("");
  const [savingMailing, setSavingMailing] = useState(false);
  const [siteStreet1, setSiteStreet1] = useState("");
  const [siteStreet2, setSiteStreet2] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteState, setSiteState] = useState("");
  const [siteZip, setSiteZip] = useState("");
  const [savingSite, setSavingSite] = useState(false);

  const refreshActivities = useCallback(() => {
    return reloadActivities();
  }, [reloadActivities]);

  const assignToMe = useCallback(() => {
    if (!contact || !currentUserId) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: currentUserId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) void reloadContact(json.data, false);
      })
      .catch(() => {});
  }, [id, contact, currentUserId, reloadContact]);

  const unassign = useCallback(() => {
    if (!contact) return;
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: null }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) void reloadContact(json.data, false);
      })
      .catch(() => {});
  }, [id, contact, reloadContact]);

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
        void reloadContact(
          (prev) =>
            prev
              ? {
                  ...prev,
                  contactTags: [...(prev.contactTags || []), { tag: json.data }],
                }
              : prev,
          false
        );
        setTagName("");
      })
      .catch(() => {})
      .finally(() => setAddingTag(false));
  }, [id, tagName, addingTag, reloadContact]);

  const removeTag = useCallback(
    (tagId: string) => {
      fetch(`/api/v1/contacts/${id}/tags/${tagId}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((json) => {
          if (!json.error)
            void reloadContact(
              (prev) =>
                prev
                  ? {
                      ...prev,
                      contactTags: (prev.contactTags || []).filter((ct) => ct.tag.id !== tagId),
                    }
                  : prev,
              false
            );
        })
        .catch(() => {});
    },
    [id, reloadContact]
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
        void reloadContact((prev) => {
          if (!prev) return prev;
          const merged = [...(prev.followUpReminders || []), json.data].sort(
            (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
          );
          return { ...prev, followUpReminders: merged };
        }, false);
        setReminderBody("");
        setReminderDue("");
        void refreshActivities();
      })
      .catch(() => {})
      .finally(() => setAddingReminder(false));
  }, [id, reminderBody, reminderDue, addingReminder, reloadContact, refreshActivities]);

  const addFarmMembership = useCallback(() => {
    if (!selectedFarmAreaId || addingFarmMembership) return;
    setAddingFarmMembership(true);
    fetch(`/api/v1/contacts/${id}/farm-memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmAreaId: selectedFarmAreaId }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        const created = json.data as FarmMembership;
        void reloadFarmMemberships((prev) => {
          const withoutExisting = (prev ?? []).filter((m) => m.id !== created.id);
          return [...withoutExisting, created].sort((a, b) =>
            `${a.farmArea.territory.name} ${a.farmArea.name}`.localeCompare(
              `${b.farmArea.territory.name} ${b.farmArea.name}`
            )
          );
        }, false);
        setSelectedFarmAreaId("");
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to add membership")
      )
      .finally(() => setAddingFarmMembership(false));
  }, [id, selectedFarmAreaId, addingFarmMembership, reloadFarmMemberships]);

  const archiveFarmMembership = useCallback(
    (membershipId: string) => {
      fetch(`/api/v1/contacts/${id}/farm-memberships/${membershipId}`, {
        method: "DELETE",
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          void reloadFarmMemberships((prev) => (prev ?? []).filter((m) => m.id !== membershipId), false);
        })
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Failed to archive membership")
        );
    },
    [id, reloadFarmMemberships]
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
            void reloadContact((prev) =>
              prev
                ? {
                    ...prev,
                    followUpReminders: (prev.followUpReminders || []).filter((r) => r.id !== reminderId),
                  }
                : prev,
              false
            );
            void refreshActivities();
          }
        })
        .catch(() => {})
        .finally(() => setPatchingReminderId(null));
    },
    [refreshActivities, reloadContact]
  );

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
      .catch(() => toast.error("Failed to add note"))
      .finally(() => setAddingNote(false));
  }, [id, noteBody, addingNote, refreshActivities]);

  useEffect(() => {
    if (!contact) return;
    setMailStreet1(contact.mailingStreet1 ?? "");
    setMailStreet2(contact.mailingStreet2 ?? "");
    setMailCity(contact.mailingCity ?? "");
    setMailState(contact.mailingState ?? "");
    setMailZip(contact.mailingZip ?? "");
    setSiteStreet1(contact.siteStreet1 ?? "");
    setSiteStreet2(contact.siteStreet2 ?? "");
    setSiteCity(contact.siteCity ?? "");
    setSiteState(contact.siteState ?? "");
    setSiteZip(contact.siteZip ?? "");
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
        void reloadContact(json.data, false);
        void refreshActivities();
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
    reloadContact,
    refreshActivities,
  ]);

  const saveSiteAddress = useCallback(() => {
    if (!contact || savingSite) return;
    setSavingSite(true);
    fetch(`/api/v1/contacts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteStreet1: siteStreet1.trim() || null,
        siteStreet2: siteStreet2.trim() || null,
        siteCity: siteCity.trim() || null,
        siteState: siteState.trim() || null,
        siteZip: siteZip.trim() || null,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        void reloadContact(json.data, false);
        void refreshActivities();
      })
      .catch(() => {})
      .finally(() => setSavingSite(false));
  }, [
    contact,
    id,
    siteStreet1,
    siteStreet2,
    siteCity,
    siteState,
    siteZip,
    savingSite,
    reloadContact,
    refreshActivities,
  ]);

  const scrollToActivityNote = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("contact-activity-note");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (loading || error || !contact) {
      setContactDetailActions(null);
      return;
    }
    setContactDetailActions(
      <ContactDetailActionsMenu
        contactId={id}
        contact={contact}
        hasCrmAccess={hasCrmAccess}
        onScrollToNote={scrollToActivityNote}
        onRefreshTimeline={() => void reloadActivities()}
        onRefreshContact={() => void reloadContact()}
      />
    );
    return () => setContactDetailActions(null);
  }, [
    loading,
    error,
    contact,
    id,
    hasCrmAccess,
    scrollToActivityNote,
    reloadActivities,
    reloadContact,
    setContactDetailActions,
  ]);

  const initials = useMemo(() => {
    const a = contact?.firstName?.trim()?.[0] ?? "";
    const b = contact?.lastName?.trim()?.[0] ?? "";
    return `${a}${b}`.toUpperCase();
  }, [contact?.firstName, contact?.lastName]);

  if (loading) return <LoadingState />;
  if (error || !contact)
    return <ErrorMessage message={error || "Not found"} onRetry={() => void reloadContact()} />;

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  const reminders = contact.followUpReminders ?? [];
  const isAssignedToMe = contact.assignedToUserId === currentUserId;

  return (
    <div className={entityDetailWorkspaceGridClassName}>
      <ContactDetailIdentityColumn
        className="order-2 lg:order-none"
        fullName={fullName}
        initials={initials}
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

      <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-none">
        <ContactActivityTimeline
          activities={activities}
          hasCrmAccess={hasCrmAccess}
          noteBody={noteBody}
          addingNote={addingNote}
          onNoteBodyChange={setNoteBody}
          onAddNote={addNote}
          workspace
        />
      </div>

      <aside className="order-3 flex min-w-0 flex-col gap-3 lg:order-none">
        <div className="space-y-3 pl-0 lg:border-l lg:border-kp-outline/25 lg:pl-3">
          <ContactBusinessContextRail contact={contact} />
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
              onReminderDismiss={(rid) => updateReminderStatus(rid, "DISMISSED")}
              hideScheduleForm
            />
          ) : null}
          <ContactTasksPanel contactId={id} hideAddButton />
        </div>

        <details className="group rounded-lg border border-kp-outline/35 bg-kp-surface-high/[0.04] [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-left transition-colors hover:bg-kp-surface-high/30">
            <span className="text-xs font-medium text-kp-on-surface">Reference & records</span>
            <p className="mt-0.5 text-[11px] leading-snug text-kp-on-surface-variant">
              Farm memberships, mailing/site addresses, background notes
            </p>
          </summary>
          <div className="space-y-3 border-t border-kp-outline/35 px-3 pb-3 pt-2">
            {hasCrmAccess ? (
              <ContactFarmMembershipsPanel
                memberships={farmMemberships}
                farmAreas={farmAreas}
                selectedFarmAreaId={selectedFarmAreaId}
                addingFarmMembership={addingFarmMembership}
                onSelectedFarmAreaIdChange={setSelectedFarmAreaId}
                onAddFarmMembership={addFarmMembership}
                onArchiveFarmMembership={archiveFarmMembership}
              />
            ) : null}
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
              collapsible
            />
            <ContactSiteAddressCard
              street1={siteStreet1}
              street2={siteStreet2}
              city={siteCity}
              state={siteState}
              zip={siteZip}
              saving={savingSite}
              onStreet1Change={setSiteStreet1}
              onStreet2Change={setSiteStreet2}
              onCityChange={setSiteCity}
              onStateChange={setSiteState}
              onZipChange={setSiteZip}
              onSave={saveSiteAddress}
              collapsible
            />
            <ContactNotesCard notes={contact.notes} referenceDensity />
          </div>
        </details>
      </aside>
    </div>
  );
}
