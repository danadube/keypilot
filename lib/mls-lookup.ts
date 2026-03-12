/**
 * Property lookup: MLS providers and RentCast (address-based).
 * RentCast: Set RENTCAST_API_KEY. MLS: Set MLS_LOOKUP_API_URL + MLS_LOOKUP_API_KEY.
 */

export type MlsLookupResult = {
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  zip: string;
  listingPrice?: number | null;
};

export type LookupAddressResult =
  | { ok: true; data: MlsLookupResult }
  | { ok: false; reason: "no_key" | "api_error" | "not_found"; status?: number };

/** RentCast: lookup by full address (Street, City, State, Zip). 50 free calls/month. */
export async function lookupPropertyByAddress(
  address: string
): Promise<LookupAddressResult> {
  const apiKey = process.env.RENTCAST_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "no_key" };

  try {
    const url = new URL("https://api.rentcast.io/v1/properties");
    url.searchParams.set("address", address.trim());
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    });

    if (!res.ok) {
      if (res.status === 401) return { ok: false, reason: "api_error", status: 401 };
      if (res.status === 404 || res.status === 204) return { ok: false, reason: "not_found" };
      return { ok: false, reason: "api_error", status: res.status };
    }

    const data = await res.json();
    // RentCast may return array, or { properties: [...] }, or single object
    const raw = Array.isArray(data) ? data : data?.properties ?? data?.data ?? data;
    const prop = Array.isArray(raw) ? raw[0] : raw;
    if (!prop || typeof prop !== "object") return { ok: false, reason: "not_found" };

    const line1 =
      prop.addressLine1 ||
      (prop.formattedAddress ? String(prop.formattedAddress).split(",")[0]?.trim() : null) ||
      prop.streetAddress ||
      prop.address?.line1;
    const city = prop.city ?? prop.address?.city;
    const state = prop.state ?? prop.address?.state;
    const zip = prop.zipCode ?? prop.zip ?? prop.postalCode ?? prop.address?.zip;

    if (!line1 || !city || !state || !zip) return { ok: false, reason: "not_found" };

    const price =
      prop.price ??
      prop.listPrice ??
      prop.listingPrice ??
      prop.lastSalePrice ??
      prop.avm?.amount ??
      null;
    const numPrice = typeof price === "number" ? price : price ? parseFloat(String(price)) : null;

    return {
      ok: true,
      data: {
        address1: String(line1).split(",")[0]?.trim() || String(line1),
        address2: prop.addressLine2 ?? prop.address?.line2 ?? null,
        city: String(city),
        state: String(state),
        zip: String(zip),
        listingPrice: numPrice && !isNaN(numPrice) ? numPrice : null,
      },
    };
  } catch {
    return { ok: false, reason: "api_error" };
  }
}

export async function lookupPropertyByMls(mlsNumber: string): Promise<MlsLookupResult | null> {
  const apiUrl = process.env.MLS_LOOKUP_API_URL;
  const apiKey = process.env.MLS_LOOKUP_API_KEY;

  if (!apiUrl || !apiKey) {
    return null;
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.set("mls", mlsNumber);
    const res = await fetch(url.toString(), {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.address1 || !data?.city || !data?.state || !data?.zip) return null;
    return {
      address1: data.address1,
      address2: data.address2 ?? null,
      city: data.city,
      state: data.state,
      zip: data.zip,
      listingPrice: data.listingPrice ?? null,
    };
  } catch {
    return null;
  }
}
