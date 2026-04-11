import { parseOptionalFiniteNumberInput } from "@/lib/transactions/parse-optional-finite-number-input";

describe("parseOptionalFiniteNumberInput", () => {
  it("returns null for empty / whitespace", () => {
    expect(parseOptionalFiniteNumberInput("")).toEqual({ value: null, invalid: false });
    expect(parseOptionalFiniteNumberInput("  ")).toEqual({ value: null, invalid: false });
  });

  it("parses finite numbers", () => {
    expect(parseOptionalFiniteNumberInput("3")).toEqual({ value: 3, invalid: false });
    expect(parseOptionalFiniteNumberInput("0.03")).toEqual({ value: 0.03, invalid: false });
    expect(parseOptionalFiniteNumberInput("-1")).toEqual({ value: -1, invalid: false });
  });

  it("marks non-numeric input invalid", () => {
    expect(parseOptionalFiniteNumberInput("abc")).toEqual({ value: null, invalid: true });
  });

  it("uses parseFloat prefix rules (12abc → 12)", () => {
    expect(parseOptionalFiniteNumberInput("12abc")).toEqual({ value: 12, invalid: false });
  });

  it("marks NaN/Infinity invalid", () => {
    expect(parseOptionalFiniteNumberInput("NaN")).toEqual({ value: null, invalid: true });
    expect(parseOptionalFiniteNumberInput("Infinity")).toEqual({ value: null, invalid: true });
  });
});
