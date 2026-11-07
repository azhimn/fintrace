import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

it("verifies the right password and rejects everything else", async () => {
  const hash = await hashPassword("correct horse");
  expect(hash).not.toContain("correct horse");
  expect(await verifyPassword("correct horse", hash)).toBe(true);
  expect(await verifyPassword("wrong horse", hash)).toBe(false);
  expect(await verifyPassword("correct horse", null)).toBe(false);
  expect(await verifyPassword("correct horse", "not-a-hash")).toBe(false);
});
