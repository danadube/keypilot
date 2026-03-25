"use client";

import { useCallback, useEffect, useState } from "react";
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
import { CheckCircle2, ListTodo, Plus } from "lucide-react";

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "NOTE",
  "TASK",
  "SHOWING",
  "FOLLOW_UP",
] as const;

type UserActivityRow = {
  id: string;
  type: (typeof ACTIVITY_TYPES)[number];
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const TEMPLATE_SELECT_NONE = "__none__";

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
              . Linking to properties or contacts can be added from the API later.
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
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-kp-surface-high/80">
                      <td className="py-2.5">
                        <span className="rounded-md bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                          {r.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="max-w-[280px] py-2.5">
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
                      </td>
                    </tr>
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
