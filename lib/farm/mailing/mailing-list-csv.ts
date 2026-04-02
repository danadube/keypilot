import type { FarmMailingRecipient } from "@/lib/farm/mailing/recipients";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
