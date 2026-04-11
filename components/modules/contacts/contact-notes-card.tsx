import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";

type ContactNotesCardProps = {
  notes: string | null;
  /** Lighter panel for secondary / reference rails. */
  referenceDensity?: boolean;
};

export function ContactNotesCard({ notes, referenceDensity = false }: ContactNotesCardProps) {
  return (
    <ContactDetailSection
      title="Notes & background"
      description={
        referenceDensity
          ? "Long-form context on this contact."
          : "Context that stays with this person across touchpoints."
      }
      icon={<FileText className={cn("shrink-0", referenceDensity ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      className={cn(
        referenceDensity &&
          "!border-kp-outline/40 !bg-kp-surface-high/10 !p-3 [&>div:first-child]:mb-2"
      )}
    >
      {notes?.trim() ? (
        <p
          className={cn(
            "whitespace-pre-wrap leading-relaxed text-kp-on-surface",
            referenceDensity ? "text-xs" : "text-sm"
          )}
        >
          {notes}
        </p>
      ) : (
        <p
          className={cn(
            "italic text-kp-on-surface-variant",
            referenceDensity ? "text-xs" : "text-sm"
          )}
        >
          No background notes yet.
        </p>
      )}
    </ContactDetailSection>
  );
}
