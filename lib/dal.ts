import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, max, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { z } from "zod";
import { addDays, cycleName, daysBetween, nextPayDate } from "./calendar";
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
import { pairBalances } from "./finance";
import { recordSchema, TYPES, type RecordInput } from "./record";

// ilike needs its wildcards escaped so a typed % or _ matches itself.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const isoDate = z.iso.date();
const validDate = (d: unknown): d is string => isoDate.safeParse(d).success;

// Each filter falls back to "not set" when its value is malformed, so a hand-edited URL can't break the query.
const loose = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);
export const transactionFilters = z.object({
  cycle: loose(z.union([z.uuid(), z.literal("all")])),
  from: loose(z.iso.date()),
  to: loose(z.iso.date()),
  type: loose(z.enum(TYPES)),
  fund: loose(z.uuid()),
  budget: loose(z.uuid()),
  category: loose(z.uuid()),
  sub: loose(z.uuid()),
  class: loose(z.enum(["needs", "wants", "none"])),
  tag: loose(z.string().trim().min(1).max(40)),
  q: loose(z.string().trim().min(1).max(100)),
});
export type TransactionFilters = z.infer<typeof transactionFilters>;

const planFields = z.object({
  frequency: z.enum(["once", "weekly", "semiweekly", "monthly", "quarterly"]).default("once"),
  date: z.iso.date().nullish(),
  sortNo: z.number().int().min(0).max(1_000_000).optional(),
});

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

  const isId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);

  /** One of this user's own (non-opening) transactions with its cycle's status. */
  const ownRow = async (id: unknown) =>
    isId(id)
      ? (
          await db
            .select({ id: transactions.id, status: cycles.status })
            .from(transactions)
            .innerJoin(cycles, eq(cycles.id, transactions.cycleId))
            .where(and(eq(transactions.id, id), eq(cycles.userId, userId), eq(transactions.isOpening, false)))
        )[0]
      : undefined;

  const ownCycle = async (id: unknown, tx: Db | Tx = db) =>
    isId(id) ? (await tx.select().from(cycles).where(and(eq(cycles.id, id), eq(cycles.userId, userId))))[0] : undefined;

  const dateOf = (input: unknown) => {
    const date = (input as Partial<RecordInput> | null)?.date;
    return typeof date === "string" ? date : "";
  };

  /** Appends `from`'s plan items to `to`, moving dated items by the gap between the two starts. */
  async function copyPlan(tx: Tx, from: { id: string; startDate: string }, to: { id: string; startDate: string }) {
    const items = await tx.select().from(planItems).where(eq(planItems.cycleId, from.id)).orderBy(asc(planItems.sortNo));
    if (!items.length) return 0;
    const [{ last }] = await tx.select({ last: max(planItems.sortNo) }).from(planItems).where(eq(planItems.cycleId, to.id));
    const shift = daysBetween(from.startDate, to.startDate);
    await tx.insert(planItems).values(
      items.map((item, i) => ({
        ...item,
        id: crypto.randomUUID(),
        total: undefined,
        cycleId: to.id,
        sortNo: (last ?? -1) + 1 + i,
        date: item.date ? addDays(item.date, shift) : null,
      })),
    );
    return items.length;
  }

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
      const existing = await ownRow(id);
      if (!existing) return { ok: false as const, missing: true as const };
      if (existing.status === "closed") return { ok: false as const, closed: true as const };
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

    /** Removes one of this user's transactions, unless its cycle is closed. False when nothing was removed. */
    deleteTransaction: async (id: string) => {
      const existing = await ownRow(id);
      if (!existing || existing.status === "closed") return false;
      await db.delete(transactions).where(and(eq(transactions.id, existing.id), ownTransactions));
      return true;
    },

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

    /**
     * Transactions matching the Transactions screen's filters, newest first, opening rows included.
     * Returns one more row than `limit` so the caller can tell the list was cut.
     */
    searchTransactions: (f: TransactionFilters, limit: number) => {
      const where: (SQL | undefined)[] = [inArray(transactions.cycleId, ownedCycles)];
      if (f.cycle && f.cycle !== "all") where.push(eq(transactions.cycleId, f.cycle));
      if (f.from) where.push(gte(transactions.date, f.from));
      if (f.to) where.push(lte(transactions.date, f.to));
      if (f.type) where.push(eq(transactions.type, f.type));
      if (f.fund) where.push(or(eq(transactions.sourceAccountId, f.fund), eq(transactions.destAccountId, f.fund)));
      if (f.budget) where.push(or(eq(transactions.sourceEnvelopeId, f.budget), eq(transactions.destEnvelopeId, f.budget)));
      if (f.sub) where.push(eq(transactions.subcategoryId, f.sub));
      if (f.category) {
        const subs = db
          .select({ id: subcategories.id })
          .from(subcategories)
          .where(and(eq(subcategories.categoryId, f.category), inArray(subcategories.categoryId, ownedCategories)));
        where.push(inArray(transactions.subcategoryId, subs));
      }
      if (f.class === "none") where.push(isNull(transactions.classification));
      else if (f.class) where.push(eq(transactions.classification, f.class));
      if (f.tag) where.push(sql`${f.tag} = any(${transactions.tags})`);
      if (f.q) {
        const like = `%${escapeLike(f.q)}%`;
        where.push(
          or(
            sql`${transactions.item} ilike ${like}`,
            sql`${transactions.location} ilike ${like}`,
            sql`${transactions.note} ilike ${like}`,
          ),
        );
      }
      return db
        .select()
        .from(transactions)
        .where(and(...where))
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(limit + 1);
    },

    /** Every tag this user has used, for the tag filter. */
    tags: async () =>
      (
        await db
          .selectDistinct({ tag: sql<string>`unnest(${transactions.tags})` })
          .from(transactions)
          .where(inArray(transactions.cycleId, ownedCycles))
      )
        .map((r) => r.tag)
        .sort((a, b) => a.localeCompare(b)),

    /**
     * Adds or edits a plan item in an open cycle of this user's. It goes through the same section 3
     * checks as a transaction, plus frequency and an optional date.
     */
    savePlanItem: async (cycleId: string, input: unknown, mode: "add" | "edit") => {
      const cycle = await ownCycle(cycleId);
      if (!cycle) return { ok: false as const, missing: true as const };
      if (cycle.status === "closed") return { ok: false as const, closed: true as const };
      const extra = planFields.safeParse(input);
      if (!extra.success) return { ok: false as const, error: extra.error };
      const date = extra.data.date ?? null;
      // A plan item needs no date, but the shared checks do: borrow the cycle's start for them.
      const parsed = await check({ ...(input as object), date: date ?? cycle.startDate, planItemId: null }, null);
      if (!parsed.success) return { ok: false as const, error: parsed.error };
      const r = parsed.data;
      const changes = {
        item: r.item,
        location: r.location,
        sourceAccountId: r.sourceAccountId,
        sourceEnvelopeId: r.sourceEnvelopeId,
        destAccountId: r.destAccountId,
        destEnvelopeId: r.destEnvelopeId,
        subcategoryId: r.subcategoryId ?? null,
        classification: r.classification,
        type: r.type,
        unit: r.unit,
        frequency: extra.data.frequency,
        quantity: r.quantity,
        amount: r.amount,
        discount: r.discount,
        date,
      };
      if (mode === "edit") {
        const updated = await db
          .update(planItems)
          .set(changes)
          .where(and(eq(planItems.id, r.id), eq(planItems.cycleId, cycle.id)))
          .returning({ id: planItems.id });
        return updated.length ? { ok: true as const } : { ok: false as const, missing: true as const };
      }
      const [{ last }] = await db
        .select({ last: max(planItems.sortNo) })
        .from(planItems)
        .where(eq(planItems.cycleId, cycle.id));
      await db
        .insert(planItems)
        .values({ ...changes, id: r.id, cycleId: cycle.id, sortNo: extra.data.sortNo ?? (last ?? -1) + 1 })
        .onConflictDoNothing({ target: planItems.id });
      return { ok: true as const };
    },

    /** Removes a plan item from an open cycle. Returns the row so it can be put back. */
    deletePlanItem: async (id: string) => {
      if (!isId(id)) return null;
      const openCycles = db
        .select({ id: cycles.id })
        .from(cycles)
        .where(and(eq(cycles.userId, userId), eq(cycles.status, "open")));
      const [row] = await db
        .delete(planItems)
        .where(and(eq(planItems.id, id), inArray(planItems.cycleId, openCycles)))
        .returning();
      return row ?? null;
    },

    /** Appends the plan of the cycle before `cycleId`, dates moved by the gap between the two starts. */
    copyPreviousPlan: async (cycleId: string) => {
      const cycle = await ownCycle(cycleId);
      if (!cycle) return "That cycle doesn't exist";
      if (cycle.status === "closed") return "This cycle is closed";
      const [before] = await db
        .select()
        .from(cycles)
        .where(and(eq(cycles.userId, userId), lt(cycles.startDate, cycle.startDate)))
        .orderBy(desc(cycles.startDate))
        .limit(1);
      if (!before) return "There's no cycle before this one";
      const copied = await db.transaction((tx) => copyPlan(tx, before, cycle));
      return copied ? null : `${before.name} has no plan items to copy`;
    },

    /**
     * Moves a cycle's start (its pay day). The cycle before ends the day before, so there is never a
     * gap or an overlap. A closed cycle before may change its end this way: that moves no record, and
     * the move is refused if any record would end up in the other cycle. Opening rows move with the
     * start. Returns an error message, or null.
     */
    moveCycleStart: async (cycleId: string, start: string) => {
      if (!validDate(start)) return "Enter a valid date";
      return db.transaction(async (tx) => {
        const cycle = await ownCycle(cycleId, tx);
        if (!cycle) return "That cycle doesn't exist";
        if (cycle.status === "closed") return "This cycle is closed, so its dates are fixed";
        if (start === cycle.startDate) return null;
        if (start > cycle.endDate) return "The start has to be on or before the cycle's end";
        const [before] = await tx
          .select()
          .from(cycles)
          .where(and(eq(cycles.userId, userId), lt(cycles.startDate, cycle.startDate)))
          .orderBy(desc(cycles.startDate))
          .limit(1);
        if (before && start <= before.startDate) return `That's on or before the start of ${before.name}`;
        const [early] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.cycleId, cycle.id), eq(transactions.isOpening, false), lt(transactions.date, start)))
          .limit(1);
        if (early) return "This cycle has records before that date";
        if (before) {
          const [late] = await tx
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(eq(transactions.cycleId, before.id), gte(transactions.date, start)))
            .limit(1);
          if (late) return `${before.name} has records on or after that date`;
          const endDate = addDays(start, -1);
          await tx.update(cycles).set({ endDate, name: cycleName(before.startDate, endDate) }).where(eq(cycles.id, before.id));
        }
        await tx
          .update(cycles)
          .set({ startDate: start, name: cycleName(start, cycle.endDate) })
          .where(eq(cycles.id, cycle.id));
        await tx
          .update(transactions)
          .set({ date: start })
          .where(and(eq(transactions.cycleId, cycle.id), eq(transactions.isOpening, true)));
        return null;
      });
    },

    /**
     * SPEC section 4 Close cycle: ends the cycle the day before `nextStart` and locks it, starts the
     * next cycle there (or uses the one that already follows it), copies the plan if the next cycle
     * has none, and carries every non-zero Fund and Budget balance over as an opening row: income
     * from External, negative when the pair was overspent.
     */
    closeCycle: async (cycleId: string, nextStart: string, payDay: number) => {
      return db.transaction(async (tx) => {
        const cycle = await ownCycle(cycleId, tx);
        if (!cycle) return { error: "That cycle doesn't exist" };
        if (cycle.status === "closed") return { error: "This cycle is already closed" };
        const [earlier] = await tx
          .select()
          .from(cycles)
          .where(and(eq(cycles.userId, userId), eq(cycles.status, "open"), lt(cycles.startDate, cycle.startDate)))
          .limit(1);
        if (earlier) return { error: `Close ${earlier.name} first` };

        let [next] = await tx
          .select()
          .from(cycles)
          .where(and(eq(cycles.userId, userId), gt(cycles.startDate, cycle.startDate)))
          .orderBy(asc(cycles.startDate))
          .limit(1);
        if (!next) {
          if (!validDate(nextStart)) return { error: "Enter a valid date" };
          if (nextStart <= cycle.startDate) return { error: "The next pay date has to be after this cycle starts" };
          const [late] = await tx
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(eq(transactions.cycleId, cycle.id), gte(transactions.date, nextStart)))
            .limit(1);
          if (late) return { error: "This cycle has records on or after that date. Pick a later pay date." };
          const endDate = addDays(nextStart, -1);
          await tx.update(cycles).set({ endDate, name: cycleName(cycle.startDate, endDate) }).where(eq(cycles.id, cycle.id));
          const end = addDays(nextPayDate(nextStart, payDay), -1);
          [next] = await tx
            .insert(cycles)
            .values({ userId, name: cycleName(nextStart, end), startDate: nextStart, endDate: end })
            .returning();
        }

        const [accts, txns, carry] = await Promise.all([
          tx.select().from(accounts).where(eq(accounts.userId, userId)),
          tx.select().from(transactions).where(eq(transactions.cycleId, cycle.id)),
          tx
            .select({ id: subcategories.id })
            .from(subcategories)
            .where(and(inArray(subcategories.categoryId, ownedCategories), eq(subcategories.name, "Carry-over from last cycle"))),
        ]);
        const external = accts.find((a) => a.kind === "external");
        if (!external) return { error: "The External Fund is missing" };
        const opening = [...pairBalances(accts, txns)]
          .filter(([, amount]) => amount !== 0)
          .map(([key, amount]) => {
            const [account, envelope] = key.split("|");
            return {
              cycleId: next.id,
              date: next.startDate,
              item: "Carry-over",
              type: "income" as const,
              sourceAccountId: external.id,
              sourceEnvelopeId: envelope || null,
              destAccountId: account,
              destEnvelopeId: envelope || null,
              amount,
              subcategoryId: carry[0]?.id ?? null,
              isOpening: true,
            };
          });
        if (opening.length) await tx.insert(transactions).values(opening);

        const [planned] = await tx.select({ id: planItems.id }).from(planItems).where(eq(planItems.cycleId, next.id)).limit(1);
        if (!planned) await copyPlan(tx, cycle, next);
        await tx.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycle.id));
        return { error: null, next };
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
