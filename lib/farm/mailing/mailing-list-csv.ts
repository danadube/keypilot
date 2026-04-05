import type { FarmMailingRecipient } from "@/lib/farm/mailing/recipients";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type FarmLabelCsvRow = {
  firstName: string;
  lastName: string;
  mailingStreet1: string;
  mailingStreet2: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;
};

/** Avery / mail-merge style: split name and mailing lines (FarmTrackr bulk export). */
export function buildFarmLabelExportCsv(rows: FarmLabelCsvRow[]): string {
  const header = [
    "First Name",
    "Last Name",
    "Mailing Street 1",
    "Mailing Street 2",
    "City",
    "State",
    "Zip",
  ].join(",");
  const body = rows.map((r) =>
    [
      escapeCsvField(r.firstName),
      escapeCsvField(r.lastName),
      escapeCsvField(r.mailingStreet1),
      escapeCsvField(r.mailingStreet2),
      escapeCsvField(r.mailingCity),
      escapeCsvField(r.mailingState),
      escapeCsvField(r.mailingZip),
    ].join(",")
  );
  return [header, ...body].join("\n");
}

/** One row per contact: name, street (combined), city, state, zip */
export function buildMailingListCsv(recipients: FarmMailingRecipient[]): string {
  const lines = [
    ["name", "street", "city", "state", "zip"].join(","),
    ...recipients.map((r) => {
      const street = r.street2 ? `${r.street} ${r.street2}` : r.street;
      return [
        escapeCsvField(r.name),
        escapeCsvField(street),
        escapeCsvField(r.city),
        escapeCsvField(r.state),
        escapeCsvField(r.zip),
      ].join(",");
    }),
  ];
  return lines.join("\n");
}
