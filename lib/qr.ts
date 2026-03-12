import QRCode from "qrcode";

/**
 * Generates a base64 PNG data URL for a QR code pointing to the public sign-in page.
 * @param slug - The unique QR slug (e.g., from OpenHouse.qrSlug)
 * @returns Base64 data URL (e.g., "data:image/png;base64,...")
 */
export async function generateQrCodeDataUrl(slug: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/oh/${slug}`;
  return QRCode.toDataURL(url, { type: "image/png", margin: 2 });
}
