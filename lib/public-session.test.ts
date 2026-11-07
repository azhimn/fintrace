import { expect, it } from "vitest";
import { publicSession } from "./public-session";

it("keeps secrets from the adapter row out of the session", () => {
  const row = { expires: "2026-12-07", sessionToken: "secret-token", userId: "u1" };
  const user = { id: "u1", email: "a@example.com", name: null, passwordHash: "scrypt:secret" };
  const json = JSON.stringify(publicSession(row, user));
  expect(json).not.toContain("secret");
  expect(JSON.parse(json)).toEqual({ expires: "2026-12-07", user: { id: "u1", email: "a@example.com", name: null } });
});
