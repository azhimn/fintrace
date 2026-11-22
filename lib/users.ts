import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./db";
import { cycles, reconciliations, transactions, users } from "./db/schema";
import { seedUser } from "./db/seed";
import { hashPassword, verifyPassword } from "./password";

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/, "Use 3 to 32 letters, digits, dots, dashes or underscores");
const password = z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters");
const newUser = z.object({
  username,
  password,
  email: z.union([z.literal(""), z.email("Enter a valid email, or leave it empty")]).transform((e) => e.toLowerCase() || null),
  isAdmin: z.boolean(),
});

const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Check the fields";

export function listUsers(db: Db) {
  return db
    .select({ id: users.id, username: users.username, email: users.email, isAdmin: users.isAdmin })
    .from(users)
    .orderBy(asc(users.username));
}

/** Creates a login with the default reference lists. Answers an error message, or null. */
export async function createUser(db: Db, input: unknown) {
  const parsed = newUser.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { username, password, email, isAdmin } = parsed.data;
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
  if (taken) return `${username} is taken. Pick another username.`;
  if (email && (await db.select({ id: users.id }).from(users).where(eq(users.email, email))).length) {
    return "Another user has that email.";
  }
  await seedUser(db, username, await hashPassword(password), { email, isAdmin });
  return null;
}

export async function renameUser(db: Db, id: string, input: unknown) {
  const parsed = username.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data));
  if (taken) return taken.id === id ? null : `${parsed.data} is taken. Pick another username.`;
  const done = await db.update(users).set({ username: parsed.data }).where(eq(users.id, id)).returning({ id: users.id });
  return done.length ? null : "That user no longer exists.";
}

/** A user changing their own password, so the current one has to match first. */
export async function changePassword(db: Db, id: string, current: string, next: unknown) {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, id));
  if (!(await verifyPassword(String(current), user?.passwordHash ?? null))) return "Your current password doesn't match.";
  return resetPassword(db, id, next);
}

export async function resetPassword(db: Db, id: string, input: unknown) {
  const parsed = password.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const done = await db.update(users).set({ passwordHash: await hashPassword(parsed.data) }).where(eq(users.id, id)).returning({ id: users.id });
  return done.length ? null : "That user no longer exists.";
}

/** Deletes a user and, through the cascades, all their data. Nobody can delete themselves. */
export async function deleteUser(db: Db, id: string, actingId: string) {
  if (id === actingId) return "You can't delete yourself.";
  return db.transaction(async (tx) => {
    // Records and counts restrict their cycle's deletion to protect history, so they go first.
    const owned = tx.select({ id: cycles.id }).from(cycles).where(eq(cycles.userId, id));
    await tx.delete(transactions).where(inArray(transactions.cycleId, owned));
    await tx.delete(reconciliations).where(inArray(reconciliations.cycleId, owned));
    const done = await tx.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return done.length ? null : "That user no longer exists.";
  });
}
