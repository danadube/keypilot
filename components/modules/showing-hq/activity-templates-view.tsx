"use client";

import { useCallback, useEffect, useState } from "react";
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
import { FileText, Plus } from "lucide-react";

const ACTIVITY_TYPES = [
  "CALL",
  "EMAIL",
  "NOTE",
  "TASK",
  "SHOWING",
  "FOLLOW_UP",
] as const;

type TemplateRow = {
  id: string;
  name: string;
  type: (typeof ACTIVITY_TYPES)[number];
  titleTemplate: string;
  descriptionTemplate: string | null;
  offsetDays: number | null;
  createdAt: string;
  updatedAt: string;
};

export function ActivityTemplatesView() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("FOLLOW_UP");
  const [titleTemplate, setTitleTemplate] = useState("");
  const [descriptionTemplate, setDescriptionTemplate] = useState("");
  const [offsetDays, setOffsetDays] = useState("");

  const load = useCallback(() => {
    setError(null);
    return fetch("/api/v1/activity-templates")
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

  const resetForm = () => {
    setName("");
    setType("FOLLOW_UP");
    setTitleTemplate("");
    setDescriptionTemplate("");
    setOffsetDays("");
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !titleTemplate.trim()) {
      setFormError("Name and title template are required");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
        titleTemplate: titleTemplate.trim(),
      };
      if (descriptionTemplate.trim()) {
        body.descriptionTemplate = descriptionTemplate.trim();
      }
      if (offsetDays.trim() !== "") {
        const n = parseInt(offsetDays, 10);
        if (!Number.isNaN(n)) body.offsetDays = n;
      }

      const res = await fetch("/api/v1/activity-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.message ?? "Could not create template");
        return;
      }
      resetForm();
      setFormOpen(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading message="Loading templates…" />;
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
        <p className="text-xs text-kp-on-surface/88">
          Reusable title, description, and due offset. When you create an activity from a template, choose a
          linked contact and/or property to fill placeholders in the title and notes.
        </p>
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
          {formOpen ? "Close" : "New template"}
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            New template
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
                placeholder="e.g. 3-day post-showing follow-up"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-kp-on-surface/90">Activity type</Label>
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
            <div className="space-y-1.5">
              <Label className="text-kp-on-surface/90">Offset days (optional)</Label>
              <Input
                type="number"
                value={offsetDays}
                onChange={(e) => setOffsetDays(e.target.value)}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
                placeholder="e.g. 3"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Title template</Label>
              <Input
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
                placeholder="Default title when you use this template"
              />
              <p className="text-[11px] leading-snug text-kp-on-surface-variant">
                Optional placeholders (only filled when you link a contact/property on the new-activity
                form):{" "}
                <span className="font-mono text-[11px] text-kp-on-surface/80">
                  {"{{contact.firstName}} {{contact.lastName}} {{contact.fullName}} {{contact.email}}"}{" "}
                  {"{{property.address1}} {{property.city}} {{property.state}} {{property.zip}}"}{" "}
                  {"{{property.fullAddress}}"}
                </span>
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-kp-on-surface/90">Description template (optional)</Label>
              <Textarea
                value={descriptionTemplate}
                onChange={(e) => setDescriptionTemplate(e.target.value)}
                className="min-h-[72px] border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              <p className="text-[11px] text-kp-on-surface-variant">
                Same placeholders work in the description.
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
              {submitting ? "Saving…" : "Create template"}
            </Button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              <FileText className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-kp-on-surface">No templates yet</p>
            <p className="mt-1 max-w-sm text-xs text-kp-on-surface-variant">
              Save reusable title and description patterns for follow-ups and tasks.
            </p>
          </div>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-kp-outline">
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Name
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Type
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Title template
                  </th>
                  <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
                    Offset
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kp-outline">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-kp-surface-high/80">
                    <td className="py-2.5 font-medium text-kp-on-surface">{r.name}</td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-kp-surface-high px-2 py-0.5 text-xs font-medium text-kp-on-surface">
                        {r.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="max-w-[320px] py-2.5 text-kp-on-surface-variant">
                      {r.titleTemplate}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                      {r.offsetDays != null ? `${r.offsetDays} days` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
