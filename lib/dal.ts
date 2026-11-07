import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "./db";
import {
  accounts,
  borrows,
  categories,
  cycles,
  envelopes,
  planItems,
  reconciliations,
  settings,
  subcategories,
  transactions,
  wishlist,
} from "./db/schema";

/**
 * Every read the app may make, bound to one user. Tables without user_id are reached through a
 * parent they own, so another user's cycle id returns nothing. Write through this layer too:
 * foreign keys alone would accept another user's account or envelope id.
 */
export function scopedTo(db: Db, userId: string) {
  const ownedCycles = db.select({ id: cycles.id }).from(cycles).where(eq(cycles.userId, userId));
  const ownedCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));

  return {
    accounts: () => db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.sortOrder)),
    envelopes: () => db.select().from(envelopes).where(eq(envelopes.userId, userId)).orderBy(asc(envelopes.sortOrder)),
    categories: () =>
      db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.sortOrder)),
    subcategories: () =>
      db.select().from(subcategories).where(inArray(subcategories.categoryId, ownedCategories)),
    settings: async () => (await db.select().from(settings).where(eq(settings.userId, userId)))[0],
    cycles: () => db.select().from(cycles).where(eq(cycles.userId, userId)).orderBy(desc(cycles.startDate)),
    planItems: (cycleId: string) =>
      db
        .select()
        .from(planItems)
        .where(and(eq(planItems.cycleId, cycleId), inArray(planItems.cycleId, ownedCycles)))
        .orderBy(asc(planItems.sortNo)),
    transactions: (cycleId: string) =>
      db
        .select()
        .from(transactions)
        .where(and(eq(transactions.cycleId, cycleId), inArray(transactions.cycleId, ownedCycles)))
        .orderBy(asc(transactions.date), asc(transactions.createdAt)),
    reconciliations: (cycleId: string) =>
      db
        .select()
        .from(reconciliations)
        .where(and(eq(reconciliations.cycleId, cycleId), inArray(reconciliations.cycleId, ownedCycles))),
    borrows: () => db.select().from(borrows).where(eq(borrows.userId, userId)).orderBy(desc(borrows.date)),
    wishlist: () =>
      db
        .select()
        .from(wishlist)
        .where(eq(wishlist.userId, userId))
        .orderBy(asc(wishlist.priority), asc(wishlist.relativePriority)),
  };
}
