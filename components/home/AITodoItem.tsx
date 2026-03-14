"use client";

import { CheckSquare, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { cn } from "@/lib/utils";

export type TodoSource =
  | "email"
  | "calendar"
  | "showing"
  | "open_house"
  | "lead"
  | "follow_up";

export interface AITodo {
  id: string;
  title: string;
  source: TodoSource;
  href?: string;
  meta?: string;
  completed?: boolean;
}

const SOURCE_CONFIG: Record<TodoSource, { label: string; tone: "accent" | "default" | "success" | "warning" }> = {
  email: { label: "Email", tone: "accent" },
  calendar: { label: "Calendar", tone: "default" },
  showing: { label: "Showing", tone: "accent" },
  open_house: { label: "Open House", tone: "success" },
  lead: { label: "Lead", tone: "warning" },
  follow_up: { label: "Follow-up", tone: "warning" },
};

export interface AITodoItemProps {
  todo: AITodo;
  className?: string;
}

export function AITodoItem({ todo, className }: AITodoItemProps) {
  const config = SOURCE_CONFIG[todo.source];
  const content = (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--brand-border)] p-3 transition-colors hover:bg-[var(--brand-surface-alt)]",
        todo.completed && "opacity-60",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <CheckSquare
          className={cn(
            "h-4 w-4 shrink-0",
            todo.completed
              ? "text-[var(--brand-success)]"
              : "text-[var(--brand-text-muted)]"
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-medium text-[var(--brand-text)] text-sm",
              todo.completed && "line-through text-[var(--brand-text-muted)]"
            )}
          >
            {todo.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <BrandBadge tone={config.tone}>{config.label}</BrandBadge>
            {todo.meta && (
              <span className="text-xs text-[var(--brand-text-muted)] truncate">
                {todo.meta}
              </span>
            )}
          </div>
        </div>
      </div>
      {todo.href && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--brand-text-muted)]" />
      )}
    </div>
  );

  return todo.href ? (
    <Link href={todo.href} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
}
