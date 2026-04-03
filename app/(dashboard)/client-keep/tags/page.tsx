"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { DashboardContextStrip } from "@/components/dashboard/DashboardContextStrip";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { UI_COPY } from "@/lib/ui-copy";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  Pencil,
  Tag,
  Trash2,
  Users,
} from "lucide-react";

type TagRow = {
  id: string;
  name: string;
  createdAt: string;
  usageCount: number;
};

export default function ClientKeepTagsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<TagRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/tags");
      const json = await res.json();
      if (!res.ok) {
        setError((json.error?.message as string) ?? UI_COPY.errors.load("tags"));
        setTags([]);
        return;
      }
      setTags(Array.isArray(json.data) ? json.data : []);
    } catch {
      setError(UI_COPY.errors.load("tags"));
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function createTag() {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);
    fetch("/api/v1/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError((json.error?.message as string) ?? "Could not create tag");
          return;
        }
        setNewName("");
        await load();
      })
      .catch(() => setError("Could not create tag"))
      .finally(() => setCreating(false));
  }

  function openRename(t: TagRow) {
    setRenameError(null);
    setRenameValue(t.name);
    setRenameTarget(t);
  }

  function closeRename() {
    if (renameSaving) return;
    setRenameTarget(null);
    setRenameError(null);
  }

  function submitRename() {
    if (!renameTarget || renameSaving) return;
    const name = renameValue.trim();
    if (!name) {
      setRenameError("Tag name required");
      return;
    }
    setRenameSaving(true);
    setRenameError(null);
    fetch(`/api/v1/tags/${encodeURIComponent(renameTarget.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 409) {
          setRenameError(
            (json.error?.message as string) ?? "A tag with this name already exists"
          );
          return;
        }
        if (!res.ok) {
          setRenameError((json.error?.message as string) ?? "Could not rename tag");
          return;
        }
        setRenameTarget(null);
        await load();
      })
      .catch(() => setRenameError("Could not rename tag"))
      .finally(() => setRenameSaving(false));
  }

  function closeDelete() {
    if (deleteSaving) return;
    setDeleteTarget(null);
  }

  function confirmDelete() {
    if (!deleteTarget || deleteSaving) return;
    setDeleteSaving(true);
    setError(null);
    fetch(`/api/v1/tags/${encodeURIComponent(deleteTarget.id)}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError((json.error?.message as string) ?? "Could not delete tag");
          return;
        }
        setDeleteTarget(null);
        await load();
      })
      .catch(() => setError("Could not delete tag"))
      .finally(() => setDeleteSaving(false));
  }

  return (
    <ModuleGate
      moduleId="client-keep"
      moduleName="ClientKeep"
      valueProposition="Full CRM for contacts, leads, tags, communication logs, and follow-ups."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-4">
        <DashboardContextStrip message="Your tags are scoped to your account. Assign them on each contact’s profile from the contacts list." />

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-kp-on-surface">Tags</h1>
          <p className="max-w-2xl text-sm text-kp-on-surface-variant">
            Create labels, see how many contacts use each one, and jump to the filtered contacts list.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-kp-outline bg-kp-surface p-4">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <label htmlFor="new-tag-name" className="text-xs font-medium text-kp-on-surface-variant">
              New tag
            </label>
            <Input
              id="new-tag-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTag()}
              placeholder="e.g. Open house — Maple"
              maxLength={50}
              className="h-9 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface placeholder:text-kp-on-surface-variant"
            />
          </div>
          <Button
            type="button"
            size="sm"
            className={cn(kpBtnPrimary, "h-9")}
            disabled={!newName.trim() || creating}
            onClick={createTag}
          >
            {creating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adding…
              </>
            ) : (
              "Create tag"
            )}
          </Button>
          <Button variant="outline" size="sm" className={cn(kpBtnSecondary, "h-9 gap-1.5")} asChild>
            <Link href="/contacts">
              <Users className="h-3.5 w-3.5" />
              All contacts
            </Link>
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-kp-outline bg-kp-surface">
          <div className="border-b border-kp-outline px-4 py-3">
            <p className="text-sm font-semibold text-kp-on-surface">Your tags</p>
            <p className="text-xs text-kp-on-surface-variant">
              Contact count is how many people currently have this tag.
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-kp-on-surface-variant" />
            </div>
          ) : tags.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <Tag className="h-8 w-8 text-kp-on-surface-variant opacity-70" />
              <p className="text-sm font-medium text-kp-on-surface">No tags yet</p>
              <p className="max-w-sm text-xs text-kp-on-surface-variant">
                Create one above, or add a tag when viewing a contact — matching names reuse the same tag.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-kp-outline hover:bg-transparent">
                  <TableHead className="text-kp-on-surface">Name</TableHead>
                  <TableHead className="w-28 text-right text-kp-on-surface">Contacts</TableHead>
                  <TableHead className="w-[200px] text-right text-kp-on-surface">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((t) => (
                  <TableRow key={t.id} className="border-kp-outline">
                    <TableCell className="font-medium text-kp-on-surface">{t.name}</TableCell>
                    <TableCell className="text-right tabular-nums text-kp-on-surface-variant">
                      {t.usageCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(kpBtnSecondary, "h-8 gap-1 text-xs")}
                          asChild
                        >
                          <Link href={`/contacts?tagId=${encodeURIComponent(t.id)}`}>
                            Open contacts
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(kpBtnSecondary, "h-8 gap-1 px-2 text-xs")}
                          onClick={() => openRename(t)}
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn(
                            kpBtnSecondary,
                            "h-8 gap-1 px-2 text-xs text-red-300 hover:border-red-500/40 hover:bg-red-500/10"
                          )}
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <p className="text-xs text-kp-on-surface-variant">
          To assign or remove tags on someone, open their contact and use the Tags section on their profile.{" "}
          <Link
            href="/contacts"
            className="inline-flex items-center gap-0.5 font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            Open contacts
            <ExternalLink className="h-3 w-3 opacity-70" />
          </Link>
        </p>
      </div>

      <BrandModal
        open={renameTarget !== null}
        onOpenChange={(o) => !o && closeRename()}
        title="Rename tag"
        description="Change the label. Contacts keep the same assignment."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary)}
              disabled={renameSaving}
              onClick={closeRename}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(kpBtnPrimary)}
              disabled={!renameValue.trim() || renameSaving}
              onClick={submitRename}
            >
              {renameSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label htmlFor="rename-tag-input" className="text-xs font-medium text-kp-on-surface-variant">
            Name
          </label>
          <Input
            id="rename-tag-input"
            value={renameValue}
            onChange={(e) => {
              setRenameValue(e.target.value);
              if (renameError) setRenameError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            maxLength={50}
            className="h-9 border-kp-outline bg-kp-surface-high text-sm"
            autoFocus
          />
          {renameError && (
            <p className="text-xs text-red-300" role="alert">
              {renameError}
            </p>
          )}
        </div>
      </BrandModal>

      <BrandModal
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && closeDelete()}
        title="Delete tag"
        description="Delete this tag? It will be removed from all contacts."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary)}
              disabled={deleteSaving}
              onClick={closeDelete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteSaving}
              onClick={confirmDelete}
            >
              {deleteSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </>
        }
      >
        {/* Actions are in footer; body reserved for future detail if needed */}
        <span className="sr-only">Confirm deletion</span>
      </BrandModal>
    </ModuleGate>
  );
}
