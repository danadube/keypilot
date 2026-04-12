"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

const actionsSummaryClass = cn(
  kpBtnSecondary,
  "flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-kp-outline px-3 text-xs font-medium text-kp-on-surface shadow-sm",
  "[&::-webkit-details-marker]:hidden"
);

type TxStatus =
  | "LEAD"
  | "UNDER_CONTRACT"
  | "IN_ESCROW"
  | "PENDING"
  | "CLOSED"
  | "FALLEN_APART";

const STATUS_OPTIONS: { value: TxStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "IN_ESCROW", label: "In escrow" },
  { value: "CLOSED", label: "Closed" },
  { value: "FALLEN_APART", label: "Fallen apart" },
];

type TransactionDetailActionsMenuProps = {
  transactionId: string;
  propertyId: string;
  primaryContactId: string | null;
  currentStatus: TxStatus;
  onScrollToNote: () => void;
  onRefreshActivity: () => void;
  onReloadTransaction: () => void;
};

export function TransactionDetailActionsMenu({
  transactionId,
  propertyId,
  primaryContactId,
  currentStatus,
  onScrollToNote,
  onRefreshActivity,
  onReloadTransaction,
}: TransactionDetailActionsMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const closeMenu = useCallback(() => {
    const el = menuRef.current;
    if (el) el.open = false;
  }, []);

  const [logCallOpen, setLogCallOpen] = useState(false);
  const [logEmailOpen, setLogEmailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [logBody, setLogBody] = useState("");
  const [logging, setLogging] = useState(false);
  const [reminderDue, setReminderDue] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [addingReminder, setAddingReminder] = useState(false);
  const [statusValue, setStatusValue] = useState<TxStatus>(currentStatus);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setStatusValue(currentStatus);
  }, [currentStatus]);

  const refresh = useCallback(() => {
    onRefreshActivity();
    onReloadTransaction();
  }, [onRefreshActivity, onReloadTransaction]);

  const logComm = useCallback(
    async (channel: "CALL" | "EMAIL") => {
      if (!primaryContactId) {
        toast.error("Set a primary contact on this transaction first.");
        return;
      }
      const body = logBody.trim();
      if (!body || logging) return;
      setLogging(true);
      try {
        const res = await fetch(`/api/v1/contacts/${primaryContactId}/communications`, {
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
    [primaryContactId, logBody, logging, refresh]
  );

  const addReminder = useCallback(async () => {
    if (!primaryContactId) {
      toast.error("Set a primary contact to schedule follow-ups.");
      return;
    }
    const body = reminderBody.trim();
    const dueAt = reminderDue;
    if (!body || !dueAt || addingReminder) return;
    setAddingReminder(true);
    try {
      const res = await fetch(`/api/v1/contacts/${primaryContactId}/reminders`, {
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
  }, [primaryContactId, reminderBody, reminderDue, addingReminder, refresh]);

  const saveStatus = useCallback(async () => {
    if (savingStatus) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValue }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setStatusOpen(false);
      toast.success("Status updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingStatus(false);
    }
  }, [transactionId, statusValue, savingStatus, refresh]);

  const scrollTo = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            "absolute left-0 z-40 mt-1 hidden min-w-[13.5rem] rounded-lg border border-kp-outline bg-kp-surface py-1 shadow-lg",
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
            Add note
          </PageHeaderActionButton>
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
          <PageHeaderActionsMenuSeparator />
          <PageHeaderActionButton
            type="button"
            onClick={() => {
              closeMenu();
              scrollTo("txn-financial-context");
            }}
          >
            Update commission / financials
          </PageHeaderActionButton>
          <PageHeaderActionButton
            type="button"
            onClick={() => {
              closeMenu();
              scrollTo("txn-record-context");
            }}
          >
            Edit record &amp; notes
          </PageHeaderActionButton>
          <PageHeaderActionButton
            type="button"
            onClick={() => {
              closeMenu();
              setStatusOpen(true);
            }}
          >
            Change status
          </PageHeaderActionButton>
          <PageHeaderActionsMenuSeparator />
          <PageHeaderActionItem href={`/properties/${propertyId}`} onClick={closeMenu}>
            View property
          </PageHeaderActionItem>
          <PageHeaderActionItem href="/contacts" onClick={closeMenu}>
            Link contact (ClientKeep)
          </PageHeaderActionItem>
          <PageHeaderActionItem href="/deals" onClick={closeMenu}>
            Link deal (Deals)
          </PageHeaderActionItem>
          <PageHeaderActionItem href="/transactions/pipeline" onClick={closeMenu}>
            Pipeline
          </PageHeaderActionItem>
        </div>
      </details>

      <BrandModal
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        title="Log call"
        description={
          primaryContactId
            ? "Creates a call entry on the client timeline."
            : "Add a primary contact on this transaction to log calls."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setLogCallOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!primaryContactId || !logBody.trim() || logging}
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
        description={
          primaryContactId
            ? "Creates an email entry on the client timeline."
            : "Add a primary contact on this transaction to log emails."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setLogEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!primaryContactId || !logBody.trim() || logging}
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
        description={
          primaryContactId
            ? "Creates a reminder on the primary contact."
            : "Set a primary contact first."
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={kpBtnPrimary}
              disabled={!primaryContactId || !reminderBody.trim() || !reminderDue || addingReminder}
              onClick={() => void addReminder()}
            >
              {addingReminder ? "Saving…" : "Schedule"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <input
            type="datetime-local"
            value={reminderDue}
            onChange={(e) => setReminderDue(e.target.value)}
            className="h-9 w-full rounded-lg border border-kp-outline bg-kp-surface px-3 text-sm text-kp-on-surface"
          />
          <Textarea
            placeholder="Reminder details…"
            value={reminderBody}
            onChange={(e) => setReminderBody(e.target.value)}
            rows={3}
            className="border-kp-outline bg-kp-surface text-kp-on-surface"
          />
        </div>
      </BrandModal>

      <BrandModal
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title="Change status"
        description="Updates pipeline status for this transaction."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className={kpBtnSecondary} onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className={kpBtnPrimary} disabled={savingStatus} onClick={() => void saveStatus()}>
              {savingStatus ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <Select value={statusValue} onValueChange={(v) => setStatusValue(v as TxStatus)}>
          <SelectTrigger className="border-kp-outline bg-kp-surface text-kp-on-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </BrandModal>

      <NewTaskModal
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultContactId={primaryContactId}
        defaultPropertyId={propertyId}
        initialTitle="Transaction task"
        onCreated={() => refresh()}
      />
    </>
  );
}
