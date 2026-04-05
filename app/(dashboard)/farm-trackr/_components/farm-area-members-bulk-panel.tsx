"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { formatSiteAddressLine } from "@/lib/contacts/format-site-address";
import { UI_COPY } from "@/lib/ui-copy";

type MemberRow = {
  membershipId: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    siteStreet1: string | null;
    siteStreet2: string | null;
    siteCity: string | null;
    siteState: string | null;
    siteZip: string | null;
  };
};

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

type TagOption = {
  id: string;
  name: string;
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

  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [tagsForPicker, setTagsForPicker] = useState<TagOption[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsLoadError, setTagsLoadError] = useState<string | null>(null);
  const [tagPickerId, setTagPickerId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [bulkTagBusy, setBulkTagBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

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
      setTagPanelOpen(false);
      setTagPickerId("");
      setNewTagName("");
      setTagsLoadError(null);
      setBulkTagBusy(false);
    }
  }, [expanded]);

  useEffect(() => {
    if (selectedMemberContactIds.size === 0) {
      setTagPanelOpen(false);
      setTagPickerId("");
      setNewTagName("");
      setBulkTagBusy(false);
    }
  }, [selectedMemberContactIds.size]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadTagsForPanel = useCallback(async () => {
    setTagsLoading(true);
    setTagsLoadError(null);
    try {
      const res = await fetch("/api/v1/tags");
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? UI_COPY.errors.load("tags"));
      const raw = (json.data ?? []) as { id: string; name: string }[];
      setTagsForPicker(raw.map((t) => ({ id: t.id, name: t.name })));
    } catch (e) {
      setTagsLoadError(e instanceof Error ? e.message : UI_COPY.errors.load("tags"));
    } finally {
      setTagsLoading(false);
    }
  }, []);

  const openTagPanel = useCallback(() => {
    setTagPanelOpen(true);
    setTagsLoadError(null);
    setTagPickerId("");
    setNewTagName("");
    if (tagsForPicker.length === 0) {
      void loadTagsForPanel();
    }
  }, [tagsForPicker.length, loadTagsForPanel]);

  const cancelTagPanel = useCallback(() => {
    setTagPanelOpen(false);
    setTagPickerId("");
    setNewTagName("");
    setTagsLoadError(null);
  }, []);

  const applyBulkTag = useCallback(async () => {
    const ids = Array.from(selectedMemberContactIds);
    if (ids.length === 0) return;
    const trimmedNew = newTagName.trim();
    if (!tagPickerId && !trimmedNew) {
      setToast({ kind: "error", text: "Choose a tag or enter a new name." });
      return;
    }
    setBulkTagBusy(true);
    try {
      const body =
        trimmedNew.length > 0
          ? { contactIds: ids, tagName: trimmedNew }
          : { contactIds: ids, tagId: tagPickerId };
      const res = await fetch("/api/v1/contacts/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Request failed");
      const n = (json.data?.taggedCount as number) ?? 0;
      setToast({
        kind: "success",
        text: `Tag added to ${n} contact${n === 1 ? "" : "s"}`,
      });
      setSelectedMemberContactIds(new Set());
      setTagPanelOpen(false);
      setTagPickerId("");
      setNewTagName("");
    } catch (e) {
      setToast({
        kind: "error",
        text: e instanceof Error ? e.message : "Couldn't apply tag",
      });
    } finally {
      setBulkTagBusy(false);
    }
  }, [selectedMemberContactIds, tagPickerId, newTagName]);

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

  const someMembersSelected = useMemo(
    () => members.some((m) => selectedMemberContactIds.has(m.contact.id)),
    [members, selectedMemberContactIds]
  );

  const memberSelectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = memberSelectAllRef.current;
    if (!el) return;
    el.indeterminate =
      members.length > 0 && someMembersSelected && !allMembersSelected;
  }, [members.length, someMembersSelected, allMembersSelected]);

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
    <>
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
                        ref={memberSelectAllRef}
                        type="checkbox"
                        checked={allMembersSelected}
                        onChange={toggleSelectAllMembers}
                        aria-label="Select all members on this page"
                        className="rounded border-kp-outline"
                      />
                    </th>
                    <th className="px-2 py-1.5">Contact</th>
                    <th className="px-2 py-1.5">Email</th>
                    <th className="px-2 py-1.5">Phone</th>
                    <th className="min-w-[10rem] px-2 py-1.5">Site address</th>
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
                      <td className="max-w-[10rem] break-words px-2 py-1.5 align-top text-kp-on-surface-variant">
                        {row.contact.email ? (
                          <a
                            href={`mailto:${row.contact.email}`}
                            className="text-kp-teal hover:underline"
                          >
                            {row.contact.email}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 align-top text-kp-on-surface-variant">
                        {row.contact.phone ? (
                          <a
                            href={`tel:${row.contact.phone}`}
                            className="text-kp-teal hover:underline"
                          >
                            {row.contact.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[14rem] px-2 py-1.5 align-top text-kp-on-surface-variant">
                        {formatSiteAddressLine(row.contact) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedMemberCount > 0 ? (
            <div className="space-y-2">
              <div
                className="flex flex-wrap items-center gap-2 rounded-md border border-kp-outline bg-kp-surface-high/80 px-2 py-2 text-xs"
                role="status"
                aria-live="polite"
              >
                <span className="font-medium text-kp-on-surface">
                  {selectedMemberCount} selected
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  disabled={bulkBusy}
                  onClick={() => setSelectedMemberContactIds(new Set())}
                >
                  Clear selection
                </Button>
              </div>
              <div
                className="flex flex-col gap-2 rounded-md border border-dashed border-kp-outline/80 bg-kp-surface-high/30 px-2 py-2 text-xs"
                aria-label="Bulk actions for selected farm members"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="w-full shrink-0 text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-muted sm:w-auto sm:pr-1">
                    Actions
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                    disabled={bulkBusy || bulkTagBusy}
                    aria-expanded={tagPanelOpen}
                    onClick={() => (tagPanelOpen ? cancelTagPanel() : openTagPanel())}
                  >
                    Add tag
                  </Button>
                  <Button type="button" size="sm" className={cn(kpBtnSecondary, "h-8 px-2 text-xs")} disabled>
                    Create follow-up
                  </Button>
                  <Button type="button" size="sm" className={cn(kpBtnSecondary, "h-8 px-2 text-xs")} disabled>
                    Export labels
                  </Button>
                </div>
                {tagPanelOpen ? (
                  <div className="rounded-md border border-kp-outline/70 bg-kp-surface-high/50 p-2">
                    <p className="mb-2 text-[11px] text-kp-on-surface-variant">
                      Apply a tag to {selectedMemberCount} selected contact
                      {selectedMemberCount === 1 ? "" : "s"}.
                    </p>
                    {tagsLoading ? (
                      <div className="mb-2 flex items-center gap-2 text-[11px] text-kp-on-surface-variant">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading tags…
                      </div>
                    ) : null}
                    {tagsLoadError ? (
                      <p className="mb-2 text-[11px] text-red-300" role="alert">
                        {tagsLoadError}
                      </p>
                    ) : null}
                    <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted">
                      Existing tag
                    </label>
                    <select
                      value={tagPickerId}
                      onChange={(e) => setTagPickerId(e.target.value)}
                      disabled={bulkTagBusy || tagsLoading}
                      className="mb-2 h-8 w-full max-w-xs rounded border border-kp-outline bg-kp-surface px-2 text-xs text-kp-on-surface"
                      aria-label="Choose existing tag"
                    >
                      <option value="">Select a tag…</option>
                      {tagsForPicker.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <label
                      htmlFor={`farm-bulk-new-tag-${areaId}`}
                      className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-kp-on-surface-muted"
                    >
                      Or new tag name
                    </label>
                    <Input
                      id={`farm-bulk-new-tag-${areaId}`}
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      disabled={bulkTagBusy}
                      placeholder="Type a new tag"
                      maxLength={50}
                      className="mb-2 h-8 max-w-xs text-xs"
                    />
                    <p className="mb-2 text-[10px] text-kp-on-surface-muted">
                      If both are set, the new name is used.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
                        disabled={bulkTagBusy || (!tagPickerId && !newTagName.trim())}
                        onClick={() => void applyBulkTag()}
                      >
                        {bulkTagBusy ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Applying…
                          </>
                        ) : (
                          "Apply"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        disabled={bulkTagBusy}
                        onClick={cancelTagPanel}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-kp-outline bg-kp-surface-high px-2 py-2 text-xs">
                <span className="sr-only">Farm area membership</span>
                <select
                  value={moveTargetId}
                  onChange={(e) => setMoveTargetId(e.target.value)}
                  className="h-8 max-w-[200px] rounded border border-kp-outline bg-kp-surface px-2 text-xs text-kp-on-surface"
                  aria-label="Move selected members to farm area"
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
                    if (!confirm(`Remove ${selectedMemberCount} contact(s) from this area?`))
                      return;
                    void runBulk({
                      action: "archive",
                      contactIds: Array.from(selectedMemberContactIds),
                    });
                  }}
                >
                  Remove from area
                </Button>
              </div>
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
    {toast ? (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "pointer-events-none fixed bottom-4 right-4 z-[200] max-w-sm rounded-md border px-3 py-2 text-sm shadow-lg",
          toast.kind === "success"
            ? "border-kp-teal/40 bg-kp-surface-high text-kp-on-surface"
            : "border-red-500/50 bg-red-950/95 text-red-50"
        )}
      >
        {toast.text}
      </div>
    ) : null}
    </>
  );
}
