"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandModal } from "@/components/ui/BrandModal";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { ChevronDown } from "lucide-react";
import {
  PageHeaderActionButton,
  PageHeaderActionItem,
  PageHeaderActionsMenuSeparator,
} from "@/components/layout/PageHeader";
import { NewTaskModal } from "@/components/tasks/new-task-modal";
import { CONTACT_STATUSES, type ContactDetailContact } from "./contact-detail-types";

const actionsSummaryClass = cn(
  kpBtnSecondary,
  "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-kp-outline px-3 text-xs font-medium text-kp-on-surface shadow-sm",
  "[&::-webkit-details-marker]:hidden"
);

type ContactDetailActionsMenuProps = {
  contactId: string;
  contact: ContactDetailContact;
  hasCrmAccess: boolean;
  onScrollToNote: () => void;
  onRefreshTimeline: () => void;
  onRefreshContact: () => void;
};

export function ContactDetailActionsMenu({
  contactId,
  contact,
  hasCrmAccess,
  onScrollToNote,
  onRefreshTimeline,
  onRefreshContact,
}: ContactDetailActionsMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = useCallback(() => {
    const el = menuRef.current;
    if (el) el.open = false;
  }, []);
  const [logCallOpen, setLogCallOpen] = useState(false);
  const [logEmailOpen, setLogEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [logBody, setLogBody] = useState("");
  const [logging, setLogging] = useState(false);
  const [reminderDue, setReminderDue] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);
  const [editFirst, setEditFirst] = useState(contact.firstName);
  const [editLast, setEditLast] = useState(contact.lastName);
  const [editEmail, setEditEmail] = useState(contact.email ?? "");
  const [editPhone, setEditPhone] = useState(contact.phone ?? "");
  const [savingEdit, setSavingEdit] = useState(false);
  const [stageValue, setStageValue] = useState(contact.status || "LEAD");
  const [savingStage, setSavingStage] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(() => {
    onRefreshTimeline();
    onRefreshContact();
  }, [onRefreshTimeline, onRefreshContact]);

  const logComm = useCallback(
    async (channel: "CALL" | "EMAIL") => {
      const body = logBody.trim();
      if (!body || logging) return;
      setLogging(true);
      try {
        const res = await fetch(`/api/v1/contacts/${contactId}/communications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, body }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        setLogBody("");
        setLogCallOpen(false);
        setLogEmailOpen(false);
        toast.success(channel === "CALL" ? "Call logged" : "Email logged");
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to log");
      } finally {
        setLogging(false);
      }
    },
    [contactId, logBody, logging, refresh]
  );

  const addReminder = useCallback(async () => {
    const body = reminderBody.trim();
    const dueAt = reminderDue;
    if (!body || !dueAt || addingReminder) return;
    setAddingReminder(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, dueAt: new Date(dueAt).toISOString() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setReminderBody("");
      setReminderDue("");
      setScheduleOpen(false);
      toast.success("Follow-up scheduled");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddingReminder(false);
    }
  }, [contactId, reminderBody, reminderDue, addingReminder, refresh]);

  const saveEdit = useCallback(async () => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editFirst.trim(),
          lastName: editLast.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setEditOpen(false);
      toast.success("Contact updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingEdit(false);
    }
  }, [contactId, editFirst, editLast, editEmail, editPhone, savingEdit, refresh]);

  const saveStage = useCallback(async () => {
    if (!hasCrmAccess || savingStage) return;
    setSavingStage(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stageValue || null }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setStageOpen(false);
      toast.success("Stage updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingStage(false);
    }
  }, [contactId, hasCrmAccess, stageValue, savingStage, refresh]);

  const promoteFarm = useCallback(async () => {
    if (!hasCrmAccess || promoting) return;
    if (!confirm("Promote this contact from Farm to Lead?")) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/v1/contacts/promote-farm-to-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [contactId] }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const promoted = (json.data?.promotedCount as number) ?? 0;
      if (promoted === 0) toast.error("Contact is not in Farm stage.");
      else {
        toast.success("Promoted to Lead");
        refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Promote failed");
    } finally {
      setPromoting(false);
    }
  }, [contactId, hasCrmAccess, promoting, refresh]);

  const removeContact = useCallback(async () => {
    if (deleting) return;
    if (
      !confirm(
        "Remove this contact from your CRM? You can restore from backups only through support."
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      toast.success("Contact removed");
      router.push("/contacts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setDeleting(false);
    }
  }, [contactId, deleting, router]);

  const openEdit = () => {
    setEditFirst(contact.firstName);
    setEditLast(contact.lastName);
    setEditEmail(contact.email ?? "");
    setEditPhone(contact.phone ?? "");
    setEditOpen(true);
  };

  const openStage = () => {
    setStageValue(contact.status || "LEAD");
    setStageOpen(true);
  };

  return (
    <>
      <details ref={menuRef} className="group relative z-30">
        <summary className={actionsSummaryClass}>
          Actions
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 opacity-70 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div
          className={cn(
            "absolute right-0 z-40 mt-1 hidden min-w-[13.5rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg",
            "group-open:block"
          )}
          role="menu"
        >
          <PageHeaderActionButton
            type="button"
            onClick={() => {
              closeMenu();
              onScrollToNote();
            }}
          >
            Quick note
          </PageHeaderActionButton>
          {hasCrmAccess ? (
            <>
              <PageHeaderActionButton
                type="button"
                onClick={() => {
                  closeMenu();
                  setLogCallOpen(true);
                }}
              >
                Log call
              </PageHeaderActionButton>
              <PageHeaderActionButton
                type="button"
                onClick={() => {
                  closeMenu();
                  setLogEmailOpen(true);
                }}
              >
                Log email
              </PageHeaderActionButton>
              {contact.email?.trim() ? (
                <PageHeaderActionItem
                  href={`mailto:${contact.email.trim()}`}
                  onClick={closeMenu}
                >
                  Send email
                </PageHeaderActionItem>
              ) : null}
              <PageHeaderActionButton
                type="button"
                onClick={() => {
                  closeMenu();
                  setScheduleOpen(true);
                }}
              >
                Schedule follow-up
              </PageHeaderActionButton>
              <PageHeaderActionButton
                type="button"
                onClick={() => {
                  closeMenu();
                  setTaskOpen(true);
                }}
              >
                Add task
              </PageHeaderActionButton>
            </>
          ) : null}
          <PageHeaderActionsMenuSeparator />
          <PageHeaderActionButton
            type="button"
            onClick={() => {
              closeMenu();
              openEdit();
            }}
          >
            Edit contact
          </PageHeaderActionButton>
          {hasCrmAccess ? (
            <PageHeaderActionButton
              type="button"
              onClick={() => {
                closeMenu();
                openStage();
              }}
            >
              Change stage
            </PageHeaderActionButton>
          ) : null}
          {hasCrmAccess && contact.status === "FARM" ? (
            <PageHeaderActionButton
              type="button"
              onClick={() => {
                closeMenu();
                void promoteFarm();
              }}
              disabled={promoting}
            >
              {promoting ? "Promoting…" : "Promote Farm → Lead"}
            </PageHeaderActionButton>
          ) : null}
          <PageHeaderActionsMenuSeparator />
          <PageHeaderActionItem href="/deals" onClick={closeMenu}>
            Link deal (Deals)
          </PageHeaderActionItem>
          <PageHeaderActionItem href="/transactions" onClick={closeMenu}>
            Link transaction
          </PageHeaderActionItem>
          <PageHeaderActionsMenuSeparator />
          <PageHeaderActionButton
            type="button"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => {
              closeMenu();
              void removeContact();
            }}
            disabled={deleting}
          >
            {deleting ? "Removing…" : "Remove contact"}
          </PageHeaderActionButton>
        </div>
      </details>

      <BrandModal
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        title="Log call"
        description="Creates a call entry on the timeline."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setLogCallOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!logBody.trim() || logging}
              onClick={() => void logComm("CALL")}
            >
              {logging ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <Textarea
          placeholder="What was discussed…"
          value={logBody}
          onChange={(e) => setLogBody(e.target.value)}
          rows={4}
          className="border-kp-outline bg-kp-surface text-kp-on-surface"
        />
      </BrandModal>

      <BrandModal
        open={logEmailOpen}
        onOpenChange={setLogEmailOpen}
        title="Log email"
        description="Creates an email entry on the timeline."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setLogEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!logBody.trim() || logging}
              onClick={() => void logComm("EMAIL")}
            >
              {logging ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <Textarea
          placeholder="Summary of the email…"
          value={logBody}
          onChange={(e) => setLogBody(e.target.value)}
          rows={4}
          className="border-kp-outline bg-kp-surface text-kp-on-surface"
        />
      </BrandModal>

      <BrandModal
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title="Schedule follow-up"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!reminderBody.trim() || !reminderDue || addingReminder}
              onClick={() => void addReminder()}
            >
              {addingReminder ? "Saving…" : "Schedule"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            type="datetime-local"
            value={reminderDue}
            onChange={(e) => setReminderDue(e.target.value)}
            className="border-kp-outline bg-kp-surface-high [color-scheme:dark]"
          />
          <Textarea
            placeholder="What to follow up on…"
            value={reminderBody}
            onChange={(e) => setReminderBody(e.target.value)}
            rows={3}
            className="border-kp-outline bg-kp-surface"
          />
        </div>
      </BrandModal>

      <BrandModal
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit contact"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className={kpBtnPrimary} disabled={savingEdit} onClick={() => void saveEdit()}>
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={editFirst} onChange={(e) => setEditFirst(e.target.value)} placeholder="First name" />
          <Input value={editLast} onChange={(e) => setEditLast(e.target.value)} placeholder="Last name" />
          <Input
            className="sm:col-span-2"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            placeholder="Email"
            type="email"
          />
          <Input
            className="sm:col-span-2"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="Phone"
          />
        </div>
      </BrandModal>

      <BrandModal
        open={stageOpen}
        onOpenChange={setStageOpen}
        title="Change stage"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setStageOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className={kpBtnPrimary} disabled={savingStage} onClick={() => void saveStage()}>
              {savingStage ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <Select value={stageValue} onValueChange={setStageValue}>
          <SelectTrigger className="border-kp-outline bg-kp-surface">
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
      </BrandModal>

      <NewTaskModal
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultContactId={contactId}
        onCreated={() => {
          refresh();
        }}
      />
    </>
  );
}
