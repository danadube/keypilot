"use client";

import { useCallback, useState } from "react";

const VISITOR_TAG_PRESETS = ["Hot", "Warm", "Maybe", "Neighbor", "Investor", "Follow-up"] as const;

export type VisitorForRow = {
  id: string;
  submittedAt: string;
  leadStatus: string | null;
  signInMethod: string;
  visitorNotes?: string | null;
  visitorTags?: string[] | null;
  contact: { firstName: string; lastName: string; email: string | null; phone: string | null };
};

export function VisitorRow({
  visitor,
  token,
  formatTime,
  onSaved,
}: {
  visitor: VisitorForRow;
  token: string;
  formatTime: (d: string) => string;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState(visitor.visitorNotes ?? "");
  const [tags, setTags] = useState<string[]>(Array.isArray(visitor.visitorTags) ? [...visitor.visitorTags] : []);
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (tagsOverride?: string[]) => {
      const notesTrimmed = notes.trim() || null;
      const tagsToSave = tagsOverride ?? tags;
      const tagsMatch =
        Array.isArray(visitor.visitorTags) &&
        visitor.visitorTags.length === tagsToSave.length &&
        tagsToSave.every((t, i) => visitor.visitorTags![i] === t);
      if (notesTrimmed === (visitor.visitorNotes ?? null) && tagsMatch) return;
      setSaving(true);
      try {
        const res = await fetch(
          `/api/v1/host/invite/${encodeURIComponent(token)}/visitors/${encodeURIComponent(visitor.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorNotes: notesTrimmed, visitorTags: tagsToSave }),
          }
        );
        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        onSaved();
      } catch {
        // silent fail
      } finally {
        setSaving(false);
      }
    },
    [visitor.id, visitor.visitorNotes, visitor.visitorTags, notes, tags, token, onSaved]
  );

  const toggleTag = (tag: string) => {
    const newTags = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(newTags);
    save(newTags);
  };

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">
        <span className="font-medium">
          {visitor.contact.firstName} {visitor.contact.lastName}
        </span>
      </td>
      <td className="py-2 pr-4 text-slate-500">{formatTime(visitor.submittedAt)}</td>
      <td className="py-2 pr-4 text-slate-600">
        {visitor.contact.email ?? visitor.contact.phone ?? "—"}
      </td>
      <td className="py-2 pr-4 min-w-[200px]">
        <div className="space-y-1.5">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save()}
            placeholder="Notes..."
            rows={2}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
          />
          <div className="flex flex-wrap gap-1">
            {VISITOR_TAG_PRESETS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  tags.includes(tag)
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {saving && <span className="text-[11px] text-slate-400">Saving...</span>}
        </div>
      </td>
    </tr>
  );
}
