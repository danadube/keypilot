import { buildManualParseDraftFromRaw } from "@/lib/integrations/supra/manual-parse-stub";
import { PDF_EXACT_NEW_SHOWING_BODY } from "@/lib/integrations/supra/supra-email-fixtures";
import {
  allPersistedFieldsMatchManualDraft,
  comparePersistedToManualDraft,
} from "@/lib/showing-hq/supra-queue-apply-parse-draft";

describe("comparePersistedToManualDraft", () => {
  it("all true when DB mirrors manual draft for PDF new-showing body", () => {
    const draft = buildManualParseDraftFromRaw({
      subject: "Supra Showings - New Showing Notification",
      rawBodyText: PDF_EXACT_NEW_SHOWING_BODY,
      sender: "suprashowing@suprasystems.com",
    });
    const item = {
      parsedAddress1: draft.parsedAddress1,
      parsedCity: draft.parsedCity,
      parsedState: draft.parsedState,
      parsedZip: draft.parsedZip,
      parsedScheduledAt: draft.parsedScheduledAt,
      parsedShowingBeganAt: draft.parsedShowingBeganAt,
      parsedEventKind: draft.parsedEventKind,
      parsedStatus: draft.parsedStatus,
      parsedAgentName: draft.parsedAgentName,
      parsedAgentEmail: draft.parsedAgentEmail,
      parseConfidence: draft.parseConfidence,
      proposedAction: draft.proposedAction,
    };
    expect(allPersistedFieldsMatchManualDraft(item, draft)).toBe(true);
  });

  it("flags mismatch when address diverges", () => {
    const draft = buildManualParseDraftFromRaw({
      subject: "Supra Showings - New Showing Notification",
      rawBodyText: PDF_EXACT_NEW_SHOWING_BODY,
      sender: "suprashowing@suprasystems.com",
    });
    const row = comparePersistedToManualDraft(
      {
        ...draft,
        parsedAddress1: "wrong",
        parsedScheduledAt: draft.parsedScheduledAt,
      },
      draft
    );
    expect(row.parsedAddress1).toBe(false);
    expect(row.parsedCity).toBe(true);
  });
});
