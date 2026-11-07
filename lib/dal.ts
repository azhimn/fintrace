import "server-only";
import { and, asc, count, desc, eq, gte, inArray, lt, lte, sql, type AnyColumn } from "drizzle-orm";
import { addDays, cycleName, nextPayDate } from "./calendar";
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
import { recordSchema, type RecordInput } from "./record";

// ilike needs its wildcards escaped so a typed % or _ matches itself.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

/**
 * Every read and write the app may make, bound to one user. Tables without user_id are reached
 * through a parent they own, so another user's cycle id returns nothing. Writes check every id
 * they store against the user's own rows: foreign keys alone would accept another user's.
 */
export function scopedTo(db: Db, userId: string) {
  const ownedCycles = db.select({ id: cycles.id }).from(cycles).where(eq(cycles.userId, userId));
  const ownedCategories = db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId));
  const ownTransactions = and(inArray(transactions.cycleId, ownedCycles), eq(transactions.isOpening, false));

  const cycleOn = async (date: string) =>
    (
      await db
        .select()
        .from(cycles)
        .where(and(eq(cycles.userId, userId), lte(cycles.startDate, date), gte(cycles.endDate, date)))
    )[0];

  /** Validates a Quick Record entry against this user's rows and fills section 3 defaults. */
  async function check(input: unknown, cycleId: string | null) {
    const [accts, envs, subs, plan] = await Promise.all([
      db.select({ id: accounts.id, kind: accounts.kind }).from(accounts).where(eq(accounts.userId, userId)),
      db.select({ id: envelopes.id, isSystem: envelopes.isSystem }).from(envelopes).where(eq(envelopes.userId, userId)),
      db
        .select({
          id: subcategories.id,
          defaultClassification: subcategories.defaultClassification,
          defaultEnvelopeId: subcategories.defaultEnvelopeId,
        })
        .from(subcategories)
        .where(inArray(subcategories.categoryId, ownedCategories)),
      cycleId
        ? db
            .select({ id: planItems.id })
            .from(planItems)
            .where(and(eq(planItems.cycleId, cycleId), inArray(planItems.cycleId, ownedCycles)))
        : [],
    ]);
    return recordSchema({ accounts: accts, envelopes: envs, subcategories: subs, planItems: plan }).safeParse(input);
  }

  const dateOf = (input: unknown) => {
    const date = (input as Partial<RecordInput> | null)?.date;
    return typeof date === "string" ? date : "";
  };

  return {
    accounts: () => db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.sortOrder)),
    envelopes: () => db.select().from(envelopes).where(eq(envelopes.userId, userId)).orderBy(asc(envelopes.sortOrder)),
    categories: () =>
      db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.sortOrder)),
    subcategories: () =>
      db.select().from(subcategories).where(inArray(subcategories.categoryId, ownedCategories)),
    settings: async () => (await db.select().from(settings).where(eq(settings.userId, userId)))[0],
    cycles: () => db.select().from(cycles).where(eq(cycles.userId, userId)).orderBy(desc(cycles.startDate)),
    /** The cycle whose dates hold `date`, if one exists. */
    cycleOn,
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
    /** Newest first across all cycles, opening rows left out. */
    recentTransactions: (limit: number) =>
      db
        .select()
        .from(transactions)
        .where(ownTransactions)
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(limit),
    /** How often each account was a source and a destination, to put the most used chips first. */
    accountUsage: async () => {
      const rows = await db
        .select({ source: transactions.sourceAccountId, dest: transactions.destAccountId, uses: count() })
        .from(transactions)
        .where(ownTransactions)
        .groupBy(transactions.sourceAccountId, transactions.destAccountId);
      const usage = { source: {} as Record<string, number>, dest: {} as Record<string, number> };
      for (const { source, dest, uses } of rows) {
        usage.source[source] = (usage.source[source] ?? 0) + uses;
        usage.dest[dest] = (usage.dest[dest] ?? 0) + uses;
      }
      return usage;
    },
    /**
     * Item names for the Quick Record combobox. Past names are fuzzy matched with pg_trgm and ranked
     * by frequency × recency, each with its latest row so picking it can fill every field. Plan
     * items of `cycleId` and unacquired wishlist items join them once the user types.
     */
    suggestItems: async (query: string, today: string, cycleId: string | undefined, limit = 6) => {
      const q = query.trim();
      const matches = (column: AnyColumn) =>
        q ? sql`(${column} ilike ${`%${escapeLike(q)}%`} or ${column} % ${q})` : sql`true`;
      // A prefix match counts in full; otherwise word similarity, floored so typos still rank by use.
      const closeness = q
        ? sql`case when ${transactions.item} ilike ${`${escapeLike(q)}%`} then 1 else greatest(word_similarity(${q}, ${transactions.item}), 0.3) end`
        : sql`1`;
      const score = sql`count(*) * ${closeness} / (1 + (${today}::date - max(${transactions.date})) / 14.0)`;

      const names = await db
        .select({ item: transactions.item })
        .from(transactions)
        .where(and(ownTransactions, matches(transactions.item)))
        .groupBy(transactions.item)
        .orderBy(desc(score))
        .limit(limit);
      const latest = names.length
        ? await db
            .selectDistinctOn([transactions.item])
            .from(transactions)
            .where(and(ownTransactions, inArray(transactions.item, names.map((n) => n.item))))
            .orderBy(transactions.item, desc(transactions.date), desc(transactions.createdAt))
        : [];
      const history = names.map((n) => latest.find((row) => row.item === n.item)!);
      if (!q) return { history, plan: [], wishes: [] };

      const [plan, wishes] = await Promise.all([
        cycleId
          ? db
              .select()
              .from(planItems)
              .where(
                and(eq(planItems.cycleId, cycleId), inArray(planItems.cycleId, ownedCycles), matches(planItems.item)),
              )
              .orderBy(asc(planItems.sortNo))
              .limit(limit)
          : [],
        db
          .select()
          .from(wishlist)
          .where(and(eq(wishlist.userId, userId), eq(wishlist.acquired, false), matches(wishlist.item)))
          .orderBy(asc(wishlist.priority), asc(wishlist.relativePriority))
          .limit(limit),
      ]);
      return { history, plan, wishes };
    },

    /**
     * Saves a Quick Record entry into the cycle holding its date. With no such cycle nothing is
     * written and `needsCycle` is set, so the user can be asked to start one.
     */
    addTransaction: async (input: unknown) => {
      const cycle = await cycleOn(dateOf(input));
      const parsed = await check(input, cycle?.id ?? null);
      if (!parsed.success) return { ok: false as const, error: parsed.error };
      if (!cycle) return { ok: false as const, needsCycle: true as const };
      if (cycle.status === "closed") return { ok: false as const, closed: true as const };
      // The id comes from the browser: a retried offline entry hits the conflict and is kept once.
      await db
        .insert(transactions)
        .values({ ...parsed.data, cycleId: cycle.id })
        .onConflictDoNothing({ target: transactions.id });
      return { ok: true as const };
    },

    /** Edits a transaction of this user's, moving it to the cycle its (possibly new) date falls in. */
    updateTransaction: async (input: unknown) => {
      const id = (input as { id?: unknown } | null)?.id;
      const [existing] =
        typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)
          ? await db.select({ id: transactions.id }).from(transactions).where(and(eq(transactions.id, id), ownTransactions))
          : [];
      if (!existing) return { ok: false as const, missing: true as const };
      const cycle = await cycleOn(dateOf(input));
      const parsed = await check(input, cycle?.id ?? null);
      if (!parsed.success) return { ok: false as const, error: parsed.error };
      if (!cycle) return { ok: false as const, needsCycle: true as const };
      if (cycle.status === "closed") return { ok: false as const, closed: true as const };
      await db
        .update(transactions)
        .set({ ...parsed.data, cycleId: cycle.id })
        .where(and(eq(transactions.id, existing.id), ownTransactions));
      return { ok: true as const };
    },

    /** Undo: removes one of this user's transactions. */
    deleteTransaction: (id: string) => db.delete(transactions).where(and(eq(transactions.id, id), ownTransactions)),

    /**
     * Starts a cycle on `start` so that `date` falls in it, keeping cycles free of gaps and overlaps:
     * the cycle before ends the day before `start`, and the new one ends the day before the next
     * pay date or the next cycle, whichever is first. Returns an error message, or null.
     */
    startCycle: async (start: string, date: string, payDay: number) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(Date.parse(start))) return "Enter a valid date";
      if (start > date) return "The cycle has to start on or before the transaction's date";
      return db.transaction(async (tx) => {
        const [before] = await tx
          .select()
          .from(cycles)
          .where(and(eq(cycles.userId, userId), lt(cycles.startDate, start)))
          .orderBy(desc(cycles.startDate))
          .limit(1);
        const [after] = await tx
          .select()
          .from(cycles)
          .where(and(eq(cycles.userId, userId), gte(cycles.startDate, start)))
          .orderBy(asc(cycles.startDate))
          .limit(1);
        if (after && after.startDate <= date) return "A cycle already starts on or before that date";
        if (before) {
          const [late] = await tx
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(eq(transactions.cycleId, before.id), gte(transactions.date, start)))
            .limit(1);
          if (late) return "The current cycle already has records on or after that date. Pick a later start.";
          if (before.status === "closed" && before.endDate >= start) return "The cycle before is closed";
          const endDate = addDays(start, -1);
          await tx
            .update(cycles)
            .set({ endDate, name: cycleName(before.startDate, endDate) })
            .where(eq(cycles.id, before.id));
        }
        const natural = addDays(nextPayDate(start, payDay), -1);
        const end = after && addDays(after.startDate, -1) < natural ? addDays(after.startDate, -1) : natural;
        if (end < date) return "That start date makes a cycle that ends before the transaction";
        await tx.insert(cycles).values({ userId, name: cycleName(start, end), startDate: start, endDate: end });
        return null;
      });
    },

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

export type Dal = ReturnType<typeof scopedTo>;
