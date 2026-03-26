"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import { CheckCircle2, Link2, ListTodo, Plus } from "lucide-react";

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "NOTE",
  "TASK",
  "SHOWING",
  "FOLLOW_UP",
] as const;

type LinkedPropertySummary = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

type LinkedContactSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

type UserActivityRow = {
  id: string;
  propertyId: string | null;
  contactId: string | null;
  property: LinkedPropertySummary | null;
  contact: LinkedContactSummary | null;
  type: (typeof ACTIVITY_TYPES)[number];
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PropertyPickerOption = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

type ContactPickerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

const TEMPLATE_SELECT_NONE = "__none__";
const LINK_SELECT_NONE = "__none__";

type ActivityTemplateRow = {
  id: string;
  name: string;
  type: (typeof ACTIVITY_TYPES)[number];
  titleTemplate: string;
  descriptionTemplate: string | null;
  offsetDays: number | null;
};

/**
 * Due date for datetime-local: current local date/time plus `offsetDays` calendar days
 * (same local hours and minutes).
 */
function dueDatetimeLocalFromOffsetDays(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function propertyPickerLabel(p: PropertyPickerOption): string {
  const tail = [p.city, p.state].filter((s) => s.trim() !== "");
  return tail.length ? `${p.address1}, ${tail.join(", ")}` : p.address1;
}

function contactPickerLabel(c: ContactPickerOption): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return c.email ? `${name} · ${c.email}` : name;
  return c.email ?? "Contact";
}

function formatLinkedProperty(p: LinkedPropertySummary): string {
  return `${p.address1}, ${p.city}, ${p.state}`;
}

function formatLinkedContact(c: LinkedContactSummary): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return c.email ?? "—";
}

function propertyFromApiRow(p: {
  id: string;
  address1: string;
  city: string;
  state: string;
}): PropertyPickerOption {
  return {
    id: p.id,
    address1: p.address1,
    city: p.city,
    state: p.state,
  };
}

function contactFromApiRow(c: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}): ContactPickerOption {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
  };
}

/**
 * Keeps Select values valid if an activity links a record missing from the picker fetch,
 * or if the FK is set but the included relation is null (defensive).
 */
function mergePropertyOptions(
  list: PropertyPickerOption[],
  row: UserActivityRow | undefined
): PropertyPickerOption[] {
  if (!row?.propertyId) return list;
  if (list.some((p) => p.id === row.propertyId)) return list;
  if (row.property) {
    return [propertyFromApiRow(row.property), ...list];
  }
  return [
    {
      id: row.propertyId,
      address1: "Linked property (details unavailable)",
      city: "",
      state: "",
    },
    ...list,
  ];
}

function mergeContactOptions(
  list: ContactPickerOption[],
  row: UserActivityRow | undefined
): ContactPickerOption[] {
  if (!row?.contactId) return list;
  if (list.some((c) => c.id === row.contactId)) return list;
  if (row.contact) {
    return [contactFromApiRow(row.contact), ...list];
  }
  return [
    {
      id: row.contactId,
      firstName: "Linked",
      lastName: "contact",
      email: null,
    },
    ...list,
  ];
}

function linkedPropertyCell(r: UserActivityRow): string {
  if (r.property) return formatLinkedProperty(r.property);
  if (r.propertyId) return "Linked property";
  return "—";
}

function linkedContactCell(r: UserActivityRow): string {
  if (r.contact) return formatLinkedContact(r.contact);
  if (r.contactId) return "Linked contact";
  return "—";
}

export function UserActivitiesView() {
  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [templates, setTemplates] = useState<ActivityTemplateRow[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<string>(TEMPLATE_SELECT_NONE);
  const [duePresetFromTemplateDays, setDuePresetFromTemplateDays] = useState<number | null>(null);

  const [type, setType] = useState<string>("TASK");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueLocal, setDueLocal] = useState("");

  const [properties, setProperties] = useState<PropertyPickerOption[]>([]);
  const [contacts, setContacts] = useState<ContactPickerOption[]>([]);
  const [linkPickersLoading, setLinkPickersLoading] = useState(false);

  const [createPropertyId, setCreatePropertyId] = useState<string>(LINK_SELECT_NONE);
  const [createContactId, setCreateContactId] = useState<string>(LINK_SELECT_NONE);

  const [linkEditRowId, setLinkEditRowId] = useState<string | null>(null);
  const [editPropertyId, setEditPropertyId] = useState<string>(LINK_SELECT_NONE);
  const [editContactId, setEditContactId] = useState<string>(LINK_SELECT_NONE);
  const [linkEditError, setLinkEditError] = useState<string | null>(null);
  const [linkSavingId, setLinkSavingId] = useState<string | null>(null);

  const editingRow = useMemo(
    () => (linkEditRowId ? rows.find((r) => r.id === linkEditRowId) : undefined),
    [linkEditRowId, rows]
  );

  const propertyOptionsForEdit = useMemo(
    () => mergePropertyOptions(properties, editingRow),
    [properties, editingRow]
  );

  const contactOptionsForEdit = useMemo(
    () => mergeContactOptions(contacts, editingRow),
    [contacts, editingRow]
  );

  const load = useCallback(() => {
    setError(null);
    return fetch("/api/v1/activities")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message ?? "Failed to load");
        else setRows(json.data ?? []);
      })
      .catch(() => setError("Failed to load"));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const loadTemplates = useCallback(() => {
    return fetch("/api/v1/activity-templates")
      .then((res) => res.json())
      .then((json: { error?: { message?: string }; data?: ActivityTemplateRow[] }) => {
        if (!json.error && Array.isArray(json.data)) {
          setTemplates(json.data);
        } else {
          setTemplates([]);
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoaded(true));
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const needLinkPickers = formOpen || linkEditRowId !== null;

  useEffect(() => {
    if (!needLinkPickers) return;
    let cancelled = false;
    setLinkPickersLoading(true);
    Promise.all([
      fetch("/api/v1/properties").then((r) => r.json()),
      fetch("/api/v1/contacts").then((r) => r.json()),
    ])
      .then(([pj, cj]: [{ data?: unknown }, { data?: unknown }]) => {
        if (cancelled) return;
        const pl = pj.data;
        const cl = cj.data;
        setProperties(
          Array.isArray(pl) ? pl.map((p) => propertyFromApiRow(p as PropertyPickerOption)) : []
        );
        setContacts(
          Array.isArray(cl) ? cl.map((c) => contactFromApiRow(c as ContactPickerOption)) : []
        );
      })
      .catch(() => {
        if (!cancelled) {
          setProperties([]);
          setContacts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLinkPickersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needLinkPickers]);

  /** If the selected template was removed (e.g. deleted in another tab), avoid an invalid Select value. */
  useEffect(() => {
    if (templateId === TEMPLATE_SELECT_NONE) return;
    if (templates.length === 0 || !templates.some((t) => t.id === templateId)) {
      setTemplateId(TEMPLATE_SELECT_NONE);
    }
  }, [templates, templateId]);

  const applyTemplate = useCallback((tpl: ActivityTemplateRow) => {
    setType(tpl.type);
    setTitle(tpl.titleTemplate);
    setDescription(tpl.descriptionTemplate?.trim() ? tpl.descriptionTemplate : "");
    if (tpl.offsetDays != null) {
      setDueLocal(dueDatetimeLocalFromOffsetDays(tpl.offsetDays));
      setDuePresetFromTemplateDays(tpl.offsetDays);
    } else {
      setDueLocal("");
      setDuePresetFromTemplateDays(null);
    }
  }, []);

  const resetForm = () => {
    setTemplateId(TEMPLATE_SELECT_NONE);
    setDuePresetFromTemplateDays(null);
    setType("TASK");
    setTitle("");
    setDescription("");
    setDueLocal("");
    setCreatePropertyId(LINK_SELECT_NONE);
    setCreateContactId(LINK_SELECT_NONE);
    setFormError(null);
  };

  const handleTemplateSelect = (value: string) => {
    setTemplateId(value);
    setFormError(null);
    if (value === TEMPLATE_SELECT_NONE) {
      setType("TASK");
      setTitle("");
      setDescription("");
      setDueLocal("");
      setDuePresetFromTemplateDays(null);
      return;
    }
    const tpl = templates.find((t) => t.id === value);
    if (tpl) applyTemplate(tpl);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type,
        title: title.trim(),
      };
      if (description.trim()) body.description = description.trim();
      if (dueLocal) body.dueAt = new Date(dueLocal).toISOString();
      if (createPropertyId !== LINK_SELECT_NONE) body.propertyId = createPropertyId;
      if (createContactId !== LINK_SELECT_NONE) body.contactId = createContactId;

      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.message ?? "Could not create activity");
        return;
      }
      resetForm();
      setFormOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    setCompleteError(null);
    setCompletingId(id);
    try {
      const res = await fetch(`/api/v1/activities/${id}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        await load();
      } else {
        setCompleteError(
          (json as { error?: { message?: string } }).error?.message ??
            "Could not mark complete"
        );
      }
    } catch {
      setCompleteError("Could not mark complete");
    } finally {
      setCompletingId(null);
    }
  };

  const openLinkEditor = (row: UserActivityRow) => {
    setLinkEditError(null);
    setLinkEditRowId(row.id);
    setEditPropertyId(row.propertyId ?? LINK_SELECT_NONE);
    setEditContactId(row.contactId ?? LINK_SELECT_NONE);
  };

  const closeLinkEditor = () => {
    setLinkEditRowId(null);
    setLinkEditError(null);
  };

  const handleSaveLinks = async (activityId: string) => {
    setLinkSavingId(activityId);
    setLinkEditError(null);
    try {
      const res = await fetch(`/api/v1/activities/${activityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: editPropertyId === LINK_SELECT_NONE ? null : editPropertyId,
          contactId: editContactId === LINK_SELECT_NONE ? null : editContactId,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setLinkEditError(json.error?.message ?? "Could not update links");
        return;
      }
      closeLinkEditor();
      await load();
    } catch {
      setLinkEditError("Could not update links");
    } finally {
      setLinkSavingId(null);
    }
  };

  const handleClearLinks = async (activityId: string) => {
    setLinkSavingId(activityId);
    setLinkEditError(null);
    try {
      const res = await fetch(`/api/v1/activities/${activityId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: null, contactId: null }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setLinkEditError(json.error?.message ?? "Could not clear links");
        return;
      }
      closeLinkEditor();
      await load();
    } catch {
      setLinkEditError("Could not clear links");
    } finally {
      setLinkSavingId(null);
    }
  };

  if (loading) return <PageLoading message="Loading activities…" />;
  if (error)
    return (
      <ErrorMessage
        message={error}
        onRetry={() => {
          setLoading(true);
          void load().finally(() => setLoading(false));
        }}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl space-y-1 text-xs text-kp-on-surface/88">
          <p>
            Personal tasks and follow-ups. (Open-house timeline items stay on the dashboard.)
          </p>
          <p className="text-kp-on-surface-variant">
            <Link
              href="/showing-hq/templates"
              className="font-medium text-kp-teal underline-offset-2 hover:underline"
            >
              Templates
            </Link>{" "}
            prefill new activities here—faster than typing the same follow-ups every time.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className={cn(kpBtnPrimary, "h-8 text-xs")}
          onClick={() => {
            resetForm();
            setFormOpen((v) => !v);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {formOpen ? "Close" : "New activity"}
        </Button>
      </div>

      {completeError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400">
          {completeError}
        </p>
      )}

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            New activity
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">From template</Label>
              {!templatesLoaded ? (
                <p className="text-xs text-kp-on-surface-variant">Loading templates…</p>
              ) : templates.length === 0 ? (
                <p className="text-xs text-kp-on-surface-variant">
                  No templates yet.{" "}
                  <Link
                    href="/showing-hq/templates"
                    className="font-medium text-kp-teal underline-offset-2 hover:underline"
                  >
                    Add templates
                  </Link>{" "}
                  to reuse titles, notes, and due offsets.
                </p>
              ) : (
                <Select value={templateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="border-kp-outline bg-kp-surface-high text-kp-on-surface">
                    <SelectValue placeholder="Choose a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TEMPLATE_SELECT_NONE}>None — start blank</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-kp-on-surface/90">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="border-kp-outline bg-kp-surface-high text-kp-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
                placeholder="What do you need to do?"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[72px] border-kp-outline bg-kp-surface-high text-kp-on-surface"
                placeholder="Notes…"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-kp-on-surface/90">Due (optional)</Label>
              <Input
                type="datetime-local"
                value={dueLocal}
                onChange={(e) => {
                  setDueLocal(e.target.value);
                  setDuePresetFromTemplateDays(null);
                }}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              {duePresetFromTemplateDays !== null && (
                <p className="text-xs text-kp-on-surface-variant">
                  Due from template:{" "}
                  {duePresetFromTemplateDays === 0
                    ? "now (same local date and time)"
                    : duePresetFromTemplateDays > 0
                      ? `today plus ${duePresetFromTemplateDays} day${duePresetFromTemplateDays === 1 ? "" : "s"}, same local time`
                      : `today minus ${Math.abs(duePresetFromTemplateDays)} day${duePresetFromTemplateDays === -1 ? "" : "s"}, same local time`}
                  .
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Property (optional)</Label>
              {linkPickersLoading ? (
                <p className="text-xs text-kp-on-surface-variant">Loading properties…</p>
              ) : (
                <Select value={createPropertyId} onValueChange={setCreatePropertyId}>
                  <SelectTrigger className="border-kp-outline bg-kp-surface-high text-kp-on-surface">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LINK_SELECT_NONE}>None</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {propertyPickerLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Contact (optional)</Label>
              {linkPickersLoading ? (
                <p className="text-xs text-kp-on-surface-variant">Loading contacts…</p>
              ) : (
                <Select value={createContactId} onValueChange={setCreateContactId}>
                  <SelectTrigger className="border-kp-outline bg-kp-surface-high text-kp-on-surface">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LINK_SELECT_NONE}>None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {contactPickerLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-kp-on-surface-variant">
                Choose from your PropertyVault and open-house visitor contacts. Not affected by templates.
              </p>
            </div>
          </div>
          {formError && (
            <p className="mt-2 text-xs font-medium text-red-400">{formError}</p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(kpBtnSecondary, "text-xs")}
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className={cn(kpBtnPrimary, "text-xs")}
            >
              {submitting ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              <ListTodo className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-kp-on-surface">No activities yet</p>
            <p className="mt-1 max-w-sm text-xs text-kp-on-surface-variant">
              Create calls, tasks, and follow-ups here—or start from a saved template on{" "}
              <Link href="/showing-hq/templates" className="text-kp-teal hover:underline">
                Templates
              </Link>
              . Optionally link each activity to a property and a contact.
            </p>
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-kp-outline">
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Type
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Title
                  </th>
                  <th className="min-w-[140px] pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Linked
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Due
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Status
                  </th>
                  <th className="w-[1%] whitespace-nowrap pb-2.5 text-right text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kp-outline">
                {rows.map((r) => {
                  const done = !!r.completedAt;
                  const savingLinks = linkSavingId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="transition-colors hover:bg-kp-surface-high/80">
                        <td className="py-2.5">
                          <span className="rounded-md bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                            {r.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="max-w-[240px] py-2.5">
                          <p
                            className={cn(
                              "font-medium text-kp-on-surface",
                              done && "text-kp-on-surface/70 line-through"
                            )}
                          >
                            {r.title}
                          </p>
                          {r.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-kp-on-surface-variant">
                              {r.description}
                            </p>
                          )}
                        </td>
                        <td className="max-w-[200px] py-2.5 align-top text-xs leading-snug text-kp-on-surface-variant">
                          <div className="flex flex-col gap-1">
                            <span>
                              <span className="text-kp-on-surface-variant/85">Property:</span>{" "}
                              <span className="text-kp-on-surface">
                                {linkedPropertyCell(r)}
                              </span>
                            </span>
                            <span>
                              <span className="text-kp-on-surface-variant/85">Contact:</span>{" "}
                              <span className="text-kp-on-surface">
                                {linkedContactCell(r)}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                          {formatWhen(r.dueAt)}
                        </td>
                        <td className="py-2.5 text-kp-on-surface-variant">
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-xs text-kp-teal">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Done {formatWhen(r.completedAt)}
                            </span>
                          ) : (
                            <span className="text-xs">Open</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingLinks}
                              className={cn(kpBtnSecondary, "h-7 gap-1 text-xs")}
                              onClick={() =>
                                linkEditRowId === r.id ? closeLinkEditor() : openLinkEditor(r)
                              }
                            >
                              <Link2 className="h-3 w-3" />
                              {linkEditRowId === r.id ? "Close" : "Links"}
                            </Button>
                            {!done && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={completingId === r.id}
                                className={cn(kpBtnSecondary, "h-7 text-xs")}
                                onClick={() => void handleComplete(r.id)}
                              >
                                {completingId === r.id ? "…" : "Complete"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {linkEditRowId === r.id && (
                        <tr className="bg-kp-surface-high/40">
                          <td colSpan={6} className="px-3 py-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                              Edit property / contact links
                            </p>
                            {linkEditError && (
                              <p className="mb-2 text-xs font-medium text-red-400">{linkEditError}</p>
                            )}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-kp-on-surface/90">Property</Label>
                                {linkPickersLoading ? (
                                  <p className="text-xs text-kp-on-surface-variant">
                                    Loading properties…
                                  </p>
                                ) : (
                                  <Select
                                    value={editPropertyId}
                                    onValueChange={setEditPropertyId}
                                  >
                                    <SelectTrigger className="border-kp-outline bg-kp-surface text-kp-on-surface">
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={LINK_SELECT_NONE}>None</SelectItem>
                                      {propertyOptionsForEdit.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {propertyPickerLabel(p)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <div className="space-y-1.5 sm:col-span-2">
                                <Label className="text-kp-on-surface/90">Contact</Label>
                                {linkPickersLoading ? (
                                  <p className="text-xs text-kp-on-surface-variant">
                                    Loading contacts…
                                  </p>
                                ) : (
                                  <Select value={editContactId} onValueChange={setEditContactId}>
                                    <SelectTrigger className="border-kp-outline bg-kp-surface text-kp-on-surface">
                                      <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={LINK_SELECT_NONE}>None</SelectItem>
                                      {contactOptionsForEdit.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                          {contactPickerLabel(c)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingLinks}
                                className={cn(kpBtnPrimary, "text-xs")}
                                onClick={() => void handleSaveLinks(r.id)}
                              >
                                {savingLinks ? "Saving…" : "Save links"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={
                                  savingLinks ||
                                  (r.propertyId == null &&
                                    r.contactId == null &&
                                    editPropertyId === LINK_SELECT_NONE &&
                                    editContactId === LINK_SELECT_NONE)
                                }
                                className={cn(kpBtnSecondary, "text-xs")}
                                onClick={() => void handleClearLinks(r.id)}
                                title="Remove property and contact links from this activity"
                              >
                                Clear both links
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
