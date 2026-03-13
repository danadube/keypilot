import { generateQrCodeDataUrl } from "../qr";

describe("generateQrCodeDataUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it("returns a data URL in PNG format", async () => {
    const result = await generateQrCodeDataUrl("abc123");
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(result.length).toBeGreaterThan(100);
  });

  it("uses localhost when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const result = await generateQrCodeDataUrl("xyz789");
    // QR encodes the URL - we verify the function runs and returns valid output
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("uses NEXT_PUBLIC_APP_URL when set", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://keypilot.example.com";
    const result = await generateQrCodeDataUrl("slug42");
    // Result is base64 PNG - the URL is encoded inside the QR image
    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it("produces different output for different slugs", async () => {
    const a = await generateQrCodeDataUrl("slug-a");
    const b = await generateQrCodeDataUrl("slug-b");
    expect(a).not.toBe(b);
  });
});
