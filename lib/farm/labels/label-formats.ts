/**
 * Avery 5160 — US Letter, 30 labels per sheet (3×10).
 *
 * Dimensions match published Avery Easy Peel® 5160 specs (margins, label size, pitch).
 * No legacy FarmTrackr code was available in-repo to reuse; constants are from the vendor layout.
 */
export const AVERY_5160 = {
  id: "avery-5160" as const,
  labelsPerPage: 30,
  columns: 3,
  rows: 10,
  /** Printable label cell */
  labelWidthIn: 2.625,
  labelHeightIn: 1,
  /** Center-to-center horizontal spacing (includes inter-column gap) */
  horizontalPitchIn: 2.75,
  /** First label inset from top / left of sheet */
  marginTopIn: 0.5,
  marginLeftIn: 0.1875,
  pageWidthIn: 8.5,
  pageHeightIn: 11,
} as const;

export function avery5160ColumnGapInches(): number {
  return AVERY_5160.horizontalPitchIn - AVERY_5160.labelWidthIn;
}
