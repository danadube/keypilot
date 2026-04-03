"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { UI_COPY } from "@/lib/ui-copy";

type MemberRow = {
  membershipId: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export type FarmAreaOption = {
  id: string;
  name: string;
  territoryName: string;
};

type Props = {
  areaId: string;
  areaName: string;
  /** From parent list (`membershipCount`) for collapsed label before first expand. */
  membershipCountListed: number;
  expanded: boolean;
  onToggle: () => void;
  onMembershipsChanged: () => void;
  otherAreas: FarmAreaOption[];
};

const MEMBERS_LIMIT = 200;
const ADD_POOL_CAP = 400;

function formatBulkSummary(d: {
  action?: string;
  created?: number;
  reactivated?: number;
  archived?: number;
  moved?: number;
  skipped?: number;
  inaccessible?: number;
}): string {
  const parts: string[] = [];
  if (d.created) parts.push(`${d.created} added`);
  if (d.reactivated) parts.push(`${d.reactivated} reactivated`);
  if (d.archived) parts.push(`${d.archived} removed from area`);
  if (d.moved) parts.push(`${d.moved} moved`);
  if (d.skipped) parts.push(`${d.skipped} skipped`);
  if (d.inaccessible) parts.push(`${d.inaccessible} not accessible`);
  return parts.length ? `Done: ${parts.join(", ")}.` : "Done.";
}

export function FarmAreaMembersBulkPanel({
  areaId,
  areaName,
  membershipCountListed,
  expanded,
  onToggle,
  onMembershipsChanged,
  otherAreas,
}: Props) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [contactsPool, setContactsPool] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  const [selectedMemberContactIds, setSelectedMemberContactIds] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedAddContactIds, setSelectedAddContactIds] = useState<Set<string>>(
    () => new Set()
  );

  const [moveTargetId, setMoveTargetId] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [showAddRows, setShowAddRows] = useState(false);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    setMembersError(null);
    try {
      const res = await fetch(
        `/api/v1/farm-areas/${areaId}/members?limit=${MEMBERS_LIMIT}&offset=0`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? UI_COPY.errors.load("members"));
      setMembers(json.data?.members ?? []);
      setMemberTotal(json.data?.total ?? 0);
    } catch (e) {
      setMembersError(e instanceof Error ? e.message : UI_COPY.errors.load("members"));
      setMembers([]);
      setMemberTotal(0);
    } finally {
      setMembersLoading(false);
    }
  }, [areaId]);

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const res = await fetch("/api/v1/contacts");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      const raw = (json.data ?? []) as {
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
      }[];
      setContactsPool(
        raw.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
        }))
      );
    } catch {
      setContactsPool([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!expanded) return;
    void loadMembers();
    void loadContacts();
  }, [expanded, loadMembers, loadContacts]);

  useEffect(() => {
    if (!expanded) {
      setSelectedMemberContactIds(new Set());
      setSelectedAddContactIds(new Set());
      setBulkMessage(null);
      setShowAddRows(false);
      setMoveTargetId("");
    }
  }, [expanded]);

  const memberContactIdSet = useMemo(
    () => new Set(members.map((m) => m.contact.id)),
    [members]
  );

  const addCandidates = useMemo(() => {
    const out: ContactOption[] = [];
    for (const c of contactsPool) {
      if (!memberContactIdSet.has(c.id)) out.push(c);
      if (out.length >= ADD_POOL_CAP) break;
    }
    return out;
  }, [contactsPool, memberContactIdSet]);

  const addCandidatesTruncated =
    contactsPool.filter((c) => !memberContactIdSet.has(c.id)).length > ADD_POOL_CAP;

  const toggleMemberSelect = (contactId: string) => {
    setSelectedMemberContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const toggleAddSelect = (contactId: string) => {
    setSelectedAddContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const allMembersSelected =
    members.length > 0 && members.every((m) => selectedMemberContactIds.has(m.contact.id));

  const toggleSelectAllMembers = () => {
    if (allMembersSelected) {
      setSelectedMemberContactIds(new Set());
    } else {
      setSelectedMemberContactIds(new Set(members.map((m) => m.contact.id)));
    }
  };

  const allAddSelected =
    addCandidates.length > 0 &&
    addCandidates.every((c) => selectedAddContactIds.has(c.id));

  const toggleSelectAllAdd = () => {
    if (allAddSelected) {
      setSelectedAddContactIds(new Set());
    } else {
      setSelectedAddContactIds(new Set(addCandidates.map((c) => c.id)));
    }
  };

  const runBulk = async (body: Record<string, unknown>) => {
    setBulkBusy(true);
    setBulkMessage(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}/members/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Request failed");
      setBulkMessage(formatBulkSummary(json.data ?? {}));
      setSelectedMemberContactIds(new Set());
      setSelectedAddContactIds(new Set());
      await loadMembers();
      onMembershipsChanged();
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBulkBusy(false);
    }
  };

  const selectedMemberCount = selectedMemberContactIds.size;
  const selectedAddCount = selectedAddContactIds.size;

  return (
    <div className="mt-2 border-t border-kp-outline pt-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-xs text-kp-on-surface-variant hover:bg-kp-surface-high/80"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>
          Members
          {!expanded && ` · ${membershipCountListed} active`}
          {expanded && !membersLoading && ` · ${memberTotal} active`}
          {expanded && memberTotal > members.length ? " (first page)" : ""}
        </span>
      </button>

      {expanded ? (
        <div className="mt-2 space-y-3 pl-1">
          {membersError ? (
            <p className="text-xs text-red-300">{membersError}</p>
          ) : null}

          {membersLoading ? (
            <div className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading members…
            </div>
          ) : members.length === 0 ? (
            <p className="text-xs text-kp-on-surface-variant">
              No active memberships in &quot;{areaName}&quot; yet. Add contacts below.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-kp-outline">
              <table className="w-full text-left text-xs">
                <thead className="bg-kp-surface-high text-kp-on-surface-variant">
                  <tr>
                    <th className="w-10 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={allMembersSelected}
                        onChange={toggleSelectAllMembers}
                        aria-label="Select all members on this page"
                        className="rounded border-kp-outline"
                      />
                    </th>
                    <th className="px-2 py-1.5">Contact</th>
                    <th className="px-2 py-1.5">Email / phone</th>
                  </tr>
                </thead>
                <tbody className="text-kp-on-surface">
                  {members.map((row) => (
                    <tr key={row.membershipId} className="border-t border-kp-outline">
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="checkbox"
                          checked={selectedMemberContactIds.has(row.contact.id)}
                          onChange={() => toggleMemberSelect(row.contact.id)}
                          aria-label={`Select ${row.contact.firstName} ${row.contact.lastName}`}
                          className="rounded border-kp-outline"
                        />
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <Link
                          href={`/contacts/${row.contact.id}`}
                          className="font-medium text-kp-on-surface hover:underline"
                        >
                          {row.contact.firstName} {row.contact.lastName}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5 align-top text-kp-on-surface-variant">
                        {row.contact.email || row.contact.phone || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedMemberCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-kp-outline bg-kp-surface-high px-2 py-2 text-xs">
              <span className="text-kp-on-surface">{selectedMemberCount} selected</span>
              <select
                value={moveTargetId}
                onChange={(e) => setMoveTargetId(e.target.value)}
                className="h-8 max-w-[200px] rounded border border-kp-outline bg-kp-surface px-2 text-xs text-kp-on-surface"
              >
                <option value="">Move to…</option>
                {otherAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.territoryName} — {a.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                disabled={bulkBusy || !moveTargetId}
                onClick={() =>
                  void runBulk({
                    action: "move",
                    contactIds: Array.from(selectedMemberContactIds),
                    targetFarmAreaId: moveTargetId,
                  })
                }
              >
                Move
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs text-red-300 hover:text-red-200"
                disabled={bulkBusy}
                onClick={() => {
                  if (!confirm(`Remove ${selectedMemberCount} contact(s) from this area?`)) return;
                  void runBulk({
                    action: "archive",
                    contactIds: Array.from(selectedMemberContactIds),
                  });
                }}
              >
                Remove from area
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                disabled={bulkBusy}
                onClick={() => setSelectedMemberContactIds(new Set())}
              >
                Clear
              </Button>
            </div>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => setShowAddRows((s) => !s)}
              className="text-xs font-medium text-kp-on-surface-variant underline-offset-2 hover:text-kp-on-surface hover:underline"
            >
              {showAddRows ? "Hide add contacts" : "Add contacts to this area"}
            </button>
            {showAddRows ? (
              <div className="mt-2 space-y-2">
                {contactsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading contacts…
                  </div>
                ) : addCandidates.length === 0 ? (
                  <p className="text-xs text-kp-on-surface-variant">
                    No eligible contacts to add (or all visible contacts are already in this area).
                  </p>
                ) : (
                  <>
                    {addCandidatesTruncated ? (
                      <p className="text-[11px] text-kp-on-surface-variant">
                        Showing first {ADD_POOL_CAP} contacts not in this area. Narrow from Contacts
                        if you need more precision later.
                      </p>
                    ) : null}
                    <div className="max-h-48 overflow-y-auto rounded-md border border-kp-outline">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-kp-surface-high text-kp-on-surface-variant">
                          <tr>
                            <th className="w-10 px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={allAddSelected}
                                onChange={toggleSelectAllAdd}
                                aria-label="Select all contacts in add list"
                                className="rounded border-kp-outline"
                              />
                            </th>
                            <th className="px-2 py-1.5">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="text-kp-on-surface">
                          {addCandidates.map((c) => (
                            <tr key={c.id} className="border-t border-kp-outline">
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={selectedAddContactIds.has(c.id)}
                                  onChange={() => toggleAddSelect(c.id)}
                                  aria-label={`Select ${c.firstName} ${c.lastName}`}
                                  className="rounded border-kp-outline"
                                />
                              </td>
                              <td className="px-2 py-1">
                                {c.firstName} {c.lastName}
                                {c.email ? (
                                  <span className="ml-1 text-kp-on-surface-variant">
                                    ({c.email})
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedAddCount > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-kp-on-surface">{selectedAddCount} selected</span>
                        <Button
                          type="button"
                          size="sm"
                          className={cn(kpBtnPrimary, "h-8 border-transparent px-2 text-xs")}
                          disabled={bulkBusy}
                          onClick={() =>
                            void runBulk({
                              action: "add",
                              contactIds: Array.from(selectedAddContactIds),
                            })
                          }
                        >
                          Add to area
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs"
                          disabled={bulkBusy}
                          onClick={() => setSelectedAddContactIds(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>

          {bulkMessage ? (
            <p className="text-[11px] text-kp-on-surface-variant">{bulkMessage}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
