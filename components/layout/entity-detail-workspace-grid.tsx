import { cn } from "@/lib/utils";

/**
 * Three-column entity detail workspace: **identity** | **activity** | **context**.
 * Use for ClientKeep contact, transaction detail, property detail — same grid, different slots.
 */
export const entityDetailWorkspaceGridClassName = cn(
  "grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,300px)] lg:items-start lg:gap-5"
);

/** Transaction detail: identity rail + document workflow only (no right rail). */
export const transactionDetailWorkspaceGridClassName = cn(
  "grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start lg:gap-6"
);
