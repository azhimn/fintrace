import { expect, it } from "vitest";
import { dayTone, monthSheet } from "./calendar";

it("reads the date in Jakarta, not UTC", () => {
  const sheet = monthSheet(new Date("2026-09-24T18:00:00Z"));
  expect([sheet.day, sheet.weekday, sheet.month, sheet.year]).toEqual([25, "Friday", "September", 2026]);
});

it("lays out a Sunday-first month", () => {
  expect(monthSheet(new Date("2026-11-07T05:00:00Z"))).toMatchObject({ leadingBlanks: 0, daysInMonth: 30 });
  expect(monthSheet(new Date("2026-09-25T05:00:00Z"))).toMatchObject({ leadingBlanks: 2, daysInMonth: 30 });
  expect(monthSheet(new Date("2028-02-10T05:00:00Z"))).toMatchObject({ daysInMonth: 29 });
});

it("colours Sundays and Fridays like a wall calendar", () => {
  expect([0, 1, 5].map(dayTone)).toEqual(["text-destructive", "text-foreground", "text-friday"]);
});
