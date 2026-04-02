import { AVERY_5160, avery5160ColumnGapInches } from "@/lib/farm/labels/label-formats";
import type { FarmMailingRecipient } from "@/lib/farm/mailing/recipients";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function chunkToPages<T>(items: T[], pageSize: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

function labelCell(r: FarmMailingRecipient | null): string {
  if (!r) {
    return `<div class="label" aria-hidden="true"></div>`;
  }
  const line2 = r.street2
    ? `<div class="label-line">${escapeHtml(r.street2)}</div>`
    : "";
  const cityLine = `${r.city}, ${r.state} ${r.zip}`;
  return `<div class="label">
      <div class="label-line label-name">${escapeHtml(r.name)}</div>
      <div class="label-line">${escapeHtml(r.street)}</div>
      ${line2}
      <div class="label-line">${escapeHtml(cityLine)}</div>
    </div>`;
}

/**
 * Full HTML document for browser print — Avery 5160, 3×10, US Letter.
 */
export function buildAvery5160PrintHtml(recipients: FarmMailingRecipient[]): string {
  if (recipients.length === 0) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Mailing labels</title></head><body style="font-family:system-ui,sans-serif;padding:24px">
      <p>No mailing-ready contacts for this scope. Add mailing address fields on contacts (street, city, state, ZIP) and ensure active farm memberships.</p>
    </body></html>`;
  }

  const colGap = avery5160ColumnGapInches();
  const { labelsPerPage, columns, labelWidthIn, labelHeightIn, marginTopIn, marginLeftIn, pageWidthIn, pageHeightIn } =
    AVERY_5160;

  const style = `
@page { size: letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; }
.sheet {
  width: ${pageWidthIn}in;
  min-height: ${pageHeightIn}in;
  page-break-after: always;
  padding: ${marginTopIn}in 0 0 ${marginLeftIn}in;
}
.sheet:last-of-type { page-break-after: auto; }
.grid {
  display: grid;
  grid-template-columns: repeat(${columns}, ${labelWidthIn}in);
  grid-auto-rows: ${labelHeightIn}in;
  column-gap: ${colGap}in;
  row-gap: 0;
}
.label {
  overflow: hidden;
  padding: 0.07in 0.09in 0.05in;
  font-family: system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 8.5pt;
  line-height: 1.2;
  color: #111;
}
.label-line {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.label-name {
  font-weight: 600;
}
.summary {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  padding: 12px 16px;
  color: #333;
}
@media print {
  .no-print { display: none !important; }
}
`;

  const pages = chunkToPages(recipients, labelsPerPage);
  const totalContacts = recipients.length;
  const pageCount = pages.length;

  const sheetsHtml = pages
    .map((pageRows) => {
      const cells: (FarmMailingRecipient | null)[] = [...pageRows];
      while (cells.length < labelsPerPage) cells.push(null);
      return `<section class="sheet"><div class="grid">${cells.map(labelCell).join("")}</div></section>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Mailing labels — Avery 5160</title><style>${style}</style></head><body>
<div class="summary no-print">${totalContacts} contact${totalContacts === 1 ? "" : "s"} · ${pageCount} page${pageCount === 1 ? "" : "s"} · Avery 5160 (3×10)</div>
${sheetsHtml}
</body></html>`;
}
