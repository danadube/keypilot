jest.mock("nanoid", () => ({ nanoid: () => "abc12345" }));

import { generateQrSlug } from "../slugify";

describe("generateQrSlug", () => {
  it("returns a string from nanoid", () => {
    const slug = generateQrSlug();
    expect(slug).toBe("abc12345");
    expect(typeof slug).toBe("string");
  });

  it("returns string of expected length", () => {
    const slug = generateQrSlug();
    expect(slug).toHaveLength(8);
  });
});
