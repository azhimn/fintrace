import { expect, it } from "vitest";
import { clearFailures, isLocked, recordFailure } from "./login-throttle";

it("locks after ten failures, then unlocks when the window ends or on success", () => {
  const start = 1_000_000;
  for (let i = 0; i < 9; i++) recordFailure("a@example.com", start);
  expect(isLocked("a@example.com", start)).toBe(false);

  recordFailure("a@example.com", start);
  expect(isLocked("a@example.com", start)).toBe(true);
  expect(isLocked("b@example.com", start)).toBe(false);
  expect(isLocked("a@example.com", start + 15 * 60 * 1000)).toBe(false);

  for (let i = 0; i < 10; i++) recordFailure("a@example.com", start);
  clearFailures("a@example.com");
  expect(isLocked("a@example.com", start)).toBe(false);
});
