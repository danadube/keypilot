import Link from "next/link";
import { Briefcase, CheckSquare, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SerializedTask } from "@/lib/tasks/task-serialize";

export interface TransactionContextRailProps {
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
  };
  deal: {
    id: string;
    contact: { id: string; firstName: string; lastName: string };
  } | null;
  tasksLoading: boolean;
  /** Open tasks for this property (from TaskPilot buckets) */
  openTasks: SerializedTask[];
  className?: string;
}

function contactName(c: { firstName: string; lastName: string }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Contact";
}

/**
 * Right rail: CRM context (deal, contact) and property-scoped tasks.
 */
export function TransactionContextRail({
  property,
  deal,
  tasksLoading,
  openTasks,
  className,
}: TransactionContextRailProps) {
  const showTasks = openTasks.slice(0, 6);

  return (
    <div className={cn("space-y-4", className)}>
      <section className="rounded-xl border border-kp-outline bg-kp-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-kp-on-surface-muted">
          Linked context
        </h2>
        <ul className="mt-3 space-y-3 text-sm">
          <li className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Property
              </p>
              <Link
                href={`/properties/${property.id}`}
                className="font-medium text-kp-teal underline-offset-2 hover:underline"
              >
                {property.address1}
              </Link>
              <p className="text-xs text-kp-on-surface-variant">
                {property.city}, {property.state}
              </p>
            </div>
          </li>
          <li className="flex gap-2">
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Deal
              </p>
              {deal ? (
                <Link
                  href={`/deals/${deal.id}`}
                  className="font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  Open deal
                </Link>
              ) : (
                <p className="text-kp-on-surface-variant">Not linked</p>
              )}
            </div>
          </li>
          <li className="flex gap-2">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
                Client (via deal)
              </p>
              {deal ? (
                <Link
                  href={`/contacts/${deal.contact.id}`}
                  className="font-medium text-kp-teal underline-offset-2 hover:underline"
                >
                  {contactName(deal.contact)}
                </Link>
              ) : (
                <p className="text-xs text-kp-on-surface-variant">
                  Link a deal to attach a contact to this closing.
                </p>
              )}
            </div>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-kp-outline bg-kp-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Related tasks
          </h2>
          <Link
            href="/task-pilot"
            className="text-[11px] font-medium text-kp-teal underline-offset-2 hover:underline"
          >
            TaskPilot
          </Link>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-kp-on-surface-variant">
          Open tasks on this property. Tasks are not yet stored per transaction ID.
        </p>
        {tasksLoading ? (
          <p className="mt-3 text-xs text-kp-on-surface-variant">Loading tasks…</p>
        ) : showTasks.length === 0 ? (
          <p className="mt-3 text-xs text-kp-on-surface-variant">No open tasks for this property.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {showTasks.map((t) => (
              <li
                key={t.id}
                className="flex gap-2 rounded-lg border border-kp-outline-variant/80 bg-kp-bg/40 px-2.5 py-2"
              >
                <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-on-surface-muted" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-kp-on-surface">{t.title}</p>
                  <p className="text-[10px] text-kp-on-surface-variant">
                    {t.dueAt
                      ? new Date(t.dueAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "No due date"}
                    {t.priority && t.priority !== "MEDIUM" ? ` · ${t.priority}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
