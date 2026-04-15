/**
 * Browser client for POST /api/v1/tasks — shared by NewTaskModal and calendar add flow.
 */
export type CreateTaskClientInput = {
  title: string;
  description?: string | null;
  dueAt: string | null;
  contactId?: string | null;
  propertyId?: string | null;
};

export async function createTaskClient(input: CreateTaskClientInput): Promise<{ id: string }> {
  const res = await fetch("/api/v1/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title.trim(),
      description: input.description?.trim() ? input.description.trim() : null,
      dueAt: input.dueAt,
      contactId: input.contactId || null,
      propertyId: input.propertyId || null,
    }),
  });
  const json = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? "Could not create task");
  const id = json.data?.id;
  if (!id) throw new Error("Could not create task");
  return { id };
}
