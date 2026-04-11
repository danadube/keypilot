/**
 * Split labels for major module page titles — first segment quieter, second primary.
 * Used by {@link PageHeader} when `title` matches a key exactly.
 */
export const MODULE_PAGE_TITLE_TWO_TONE: Readonly<
  Record<string, readonly [string, string]>
> = {
  PropertyVault: ["Property", "Vault"],
  TransactionHQ: ["Transaction", "HQ"],
  ClientKeep: ["Client", "Keep"],
  FarmTrackr: ["Farm", "Trackr"],
  ShowingHQ: ["Showing", "HQ"],
  TaskPilot: ["Task", "Pilot"],
  MarketPilot: ["Market", "Pilot"],
  SellerPulse: ["Seller", "Pulse"],
} as const;

export function getModulePageTitleTwoTone(
  title: string
): readonly [string, string] | undefined {
  return MODULE_PAGE_TITLE_TWO_TONE[title];
}
