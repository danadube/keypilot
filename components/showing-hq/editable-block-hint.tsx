import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Consistent discoverability: right-aligned pencil + "Edit" for blocks with editable fields.
 */
export function EditableBlockHint({
  className,
  label = "Edit",
}: {
  className?: string;
  /** Screen reader / visible label after icon */
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-kp-teal",
        className
      )}
      title="Fields in this section are editable"
    >
      <Pencil className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </span>
  );
}
