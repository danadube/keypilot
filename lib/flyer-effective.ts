/**
 * Resolve effective flyer URL for an open house.
 * Priority: openHouse.flyerOverrideUrl > openHouse.flyerUrl > property.flyerUrl (when property.flyerEnabled).
 */

type OpenHouseWithProperty = {
  flyerOverrideUrl: string | null;
  flyerUrl: string | null;
  property: {
    flyerUrl: string | null;
    flyerEnabled: boolean | null;
  };
};

export function getEffectiveFlyerUrl(oh: OpenHouseWithProperty): string | null {
  if (oh.flyerOverrideUrl?.trim()) return oh.flyerOverrideUrl.trim();
  if (oh.flyerUrl?.trim()) return oh.flyerUrl.trim();
  const p = oh.property;
  if (p.flyerEnabled !== false && p.flyerUrl?.trim()) return p.flyerUrl.trim();
  return null;
}
