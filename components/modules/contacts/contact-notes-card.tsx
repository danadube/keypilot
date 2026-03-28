import { FileText } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";

type ContactNotesCardProps = {
  notes: string | null;
};

export function ContactNotesCard({ notes }: ContactNotesCardProps) {
  return (
    <ContactDetailSection
      title="Notes & background"
      description="Context that stays with this person across touchpoints."
      icon={<FileText className="h-3.5 w-3.5" />}
    >
      {notes?.trim() ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-kp-on-surface">
          {notes}
        </p>
      ) : (
        <p className="text-sm italic text-kp-on-surface-variant">
          No background notes yet.
        </p>
      )}
    </ContactDetailSection>
  );
}
