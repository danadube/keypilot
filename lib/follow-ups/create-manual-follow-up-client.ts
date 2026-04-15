/**
 * Browser client for POST /api/v1/follow-ups with MANUAL source (calendar quick-add).
 */
export type CreateManualFollowUpClientInput = {
  contactId: string;
  title: string;
  notes?: string | null;
  /** ISO 8601 datetime string (e.g. from local date+time). */
  dueAtIso: string;
  priority?: "LOW" | "MEDIUM" | "HIGH";
};

export async function createManualFollowUpClient(
  input: CreateManualFollowUpClientInput
): Promise<{ id: string }> {
  const res = await fetch("/api/v1/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactId: input.contactId,
      sourceType: "MANUAL",
      sourceId: "manual",
      title: input.title.trim(),
      notes: input.notes?.trim() ? input.notes.trim() : null,
      dueAt: input.dueAtIso,
      priority: input.priority ?? "MEDIUM",
    }),
  });
  const json = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? "Could not create follow-up");
  const id = json.data?.id;
  if (!id) throw new Error("Could not create follow-up");
  return { id };
}
