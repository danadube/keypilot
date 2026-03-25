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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const resetForm = () => {
    setType("TASK");
    setTitle("");
    setDescription("");
    setDueLocal("");
    setFormError(null);
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
    setCompletingId(id);
    try {
      const res = await fetch(`/api/v1/activities/${id}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await load();
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
        <p className="text-xs text-kp-on-surface/88">
          Personal tasks and follow-ups. (Open-house timeline items stay on the dashboard.)
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
          {formOpen ? "Close" : "New activity"}
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-kp-outline bg-kp-surface p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant">
            New activity
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
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
                onChange={(e) => setDueLocal(e.target.value)}
                className="border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
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
              Create calls, tasks, and follow-ups here. Linking to properties or contacts can be added from the API later.
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
