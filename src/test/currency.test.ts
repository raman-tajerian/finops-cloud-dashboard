import { describe, expect, it } from "vitest";
import { CURRENCIES, DEMO_RATES, convert, fmtMoney, fmtMoneyCompact, getActiveCurrency, normalizeCurrency, setActiveCurrency } from "@/data/currency";

describe("currency", () => {
  it("supports exactly USD, EUR, SEK, GBP", () => {
    expect(CURRENCIES).toEqual(["USD", "EUR", "SEK", "GBP"]);
  });
  it("normalizes unknown values to USD", () => {
    expect(normalizeCurrency("SEK")).toBe("SEK");
    expect(normalizeCurrency("sek")).toBe("USD");
    expect(normalizeCurrency(undefined)).toBe("USD");
    expect(normalizeCurrency("JPY")).toBe("USD");
  });
  it("converts with the documented demo rates", () => {
    expect(DEMO_RATES.USD).toBe(1);
    expect(convert(100, "USD")).toBe(100);
    expect(convert(100, "EUR")).toBeCloseTo(92, 5);
    expect(convert(100, "SEK")).toBeCloseTo(1055, 5);
    expect(convert(100, "GBP")).toBeCloseTo(79, 5);
  });
  it("formats via Intl.NumberFormat in the selected currency", () => {
    expect(fmtMoney(1234, { currency: "USD" })).toBe("$1,234");
    expect(fmtMoney(1234, { currency: "SEK" })).toContain("13");
    expect(fmtMoney(1234, { currency: "EUR" })).toContain("€");
    expect(fmtMoney(1234, { currency: "GBP" })).toContain("£");
  });
  it("never formats the unconverted USD amount in another currency", () => {
    expect(fmtMoney(100, { currency: "SEK" })).not.toContain("100");
    expect(fmtMoney(100, { currency: "EUR" })).toContain("92");
  });
  it("handles sign and compact notation", () => {
    expect(fmtMoney(-50, { currency: "USD" })).toContain("−");
    expect(fmtMoney(50, { currency: "USD", sign: true })).toContain("+");
    expect(fmtMoneyCompact(12_345_678, "USD")).toContain("$12.3");
  });
  it("tracks the active currency and resets cleanly", () => {
    setActiveCurrency("EUR");
    expect(getActiveCurrency()).toBe("EUR");
    expect(fmtMoney(100)).toContain("€");
    setActiveCurrency("USD");
    expect(getActiveCurrency()).toBe("USD");
  });
});
