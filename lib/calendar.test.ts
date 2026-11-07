import { expect, it } from "vitest";
import { addDays, cycleName, nextPayDate, payDateOnOrBefore, today } from "./calendar";

it("reads today in Jakarta, not UTC", () => {
  expect(today(new Date("2026-09-24T18:00:00Z"))).toBe("2026-09-25");
  expect(today(new Date("2026-09-24T16:00:00Z"))).toBe("2026-09-24");
});

it("adds days across months and years", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
});

it("finds the pay date a cycle holding a date starts on", () => {
  expect(payDateOnOrBefore("2026-11-07", 25)).toBe("2026-10-25");
  expect(payDateOnOrBefore("2026-11-25", 25)).toBe("2026-11-25");
  expect(payDateOnOrBefore("2026-03-05", 31)).toBe("2026-02-28");
  expect(payDateOnOrBefore("2027-01-03", 25)).toBe("2026-12-25");
});

it("runs a cycle to next month's pay day, even when this one started early", () => {
  expect(nextPayDate("2026-10-25", 25)).toBe("2026-11-25");
  expect(nextPayDate("2026-10-23", 25)).toBe("2026-11-25");
  expect(nextPayDate("2026-10-02", 25)).toBe("2026-10-25");
  expect(nextPayDate("2026-12-25", 25)).toBe("2027-01-25");
  expect(nextPayDate("2026-01-31", 31)).toBe("2026-02-28");
});

it("names a cycle like the spec", () => {
  expect(cycleName("2026-09-25", "2026-10-23")).toBe("25 Sep – 23 Oct 2026");
  expect(cycleName("2026-12-25", "2027-01-24")).toBe("25 Dec 2026 – 24 Jan 2027");
});
