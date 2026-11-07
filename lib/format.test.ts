import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPercent, formatQuantity, parseAmount } from "./format";

describe("id-ID formatters", () => {
  it("formats money with dot thousands and no decimals", () => {
    expect(formatMoney(1234567)).toBe("Rp 1.234.567");
    expect(formatMoney(-1234567)).toBe("-Rp 1.234.567");
    expect(formatMoney(0)).toBe("Rp 0");
    expect(formatMoney(BigInt("9007199254740993"))).toBe("Rp 9.007.199.254.740.993");
  });

  it("rounds stray fractions instead of showing decimals", () => {
    expect(formatMoney(1234.6)).toBe("Rp 1.235");
  });

  it("formats quantities and percentages with a comma", () => {
    expect(formatQuantity(22.5)).toBe("22,5");
    expect(formatQuantity("22.500")).toBe("22,5");
    expect(formatPercent(0.125)).toBe("12,5%");
  });

  it("keeps dates in English without shifting the day", () => {
    expect(formatDate("2026-09-25")).toBe("Fri, Sep 25");
    expect(formatDate("2026-01-01")).toBe("Thu, Jan 1");
  });
});

describe("parseAmount", () => {
  it.each([
    ["50rb", 50_000],
    ["50k", 50_000],
    ["1,5jt", 1_500_000],
    ["1.234.567", 1_234_567],
    ["50.000", 50_000],
    ["1.234", 1_234],
    ["1000", 1_000],
    ["0", 0],
    ["1,1jt", 1_100_000],
    ["2,75rb", 2_750],
    ["1.500rb", 1_500_000],
    ["1,25k", 1_250],
    ["Rp 1.234.567", 1_234_567],
    ["Rp50rb", 50_000],
    ["rp. 50.000", 50_000],
    [" 50 RB ", 50_000],
    ["1,5JT", 1_500_000],
    ["1.234,00", 1_234],
    ["Rp 1.234.567", 1_234_567],
    ["-50rb", -50_000],
    ["-Rp 1.234.567", -1_234_567],
  ])("reads %j as %d", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    "",
    "abc",
    "rb",
    "1.5jt", // a dot only groups thousands
    "1,234,567", // English grouping
    "12.34",
    "1.23.456",
    "1,5", // half a rupiah
    "1.234,50",
    "1,2345k",
    "50rbu",
    "--5",
    "99999999999999999",
  ])("rejects %j", (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it("round-trips every formatted value", () => {
    for (const value of [0, 37_000, 3_789_316, -1_234_567]) {
      expect(parseAmount(formatMoney(value))).toBe(value);
    }
  });
});
