import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it } from "vitest";
import { scopedTo } from "../dal";
import { lineTotal } from "../finance";
import type { Db } from "./index";
import { accounts, categories, cycles, envelopes, settings, subcategories, transactions, wishlist } from "./schema";
import { DEFAULT_SHORTCUTS, seedUser } from "./seed";

// Runs the real /drizzle migrations on PGlite, Postgres compiled to WASM, so no server is needed.
let db: Db;
let alice: string;
let bob: string;

async function addCycle(owner: string, startDate: string, endDate: string) {
  const [cycle] = await db.insert(cycles).values({ userId: owner, name: startDate, startDate, endDate }).returning();
  return cycle;
}

beforeAll(async () => {
  const pg = drizzle({ client: new PGlite({ extensions: { pg_trgm, btree_gist } }) });
  await migrate(pg, { migrationsFolder: "drizzle" });
  db = pg as unknown as Db;
  alice = (await seedUser(db, "alice@example.com", "hash")).userId;
  bob = (await seedUser(db, "bob@example.com", "hash")).userId;
}, 60_000);

describe("seed", () => {
  it("creates the SPEC accounts with their flags", async () => {
    const rows = await scopedTo(db, alice).accounts();
    expect(rows.map((a) => [a.name, a.kind, a.countsAsUsable, a.minBalance])).toEqual([
      ["Cash", "cash", true, 0],
      ["Mandiri", "bank", true, 37_000],
      ["Jago", "bank", true, 0],
      ["Dana", "e_wallet", false, 0],
      ["Gopay", "e_wallet", false, 0],
      ["Shopee Pay", "e_wallet", false, 0],
      ["e-Money", "e_wallet", false, 0],
      ["External", "external", false, 0],
    ]);
  });

  it("creates the envelopes with Unallocated as the only system one", async () => {
    const rows = await scopedTo(db, alice).envelopes();
    expect(rows).toHaveLength(14);
    expect(rows.filter((e) => e.isSystem).map((e) => e.name)).toEqual(["Unallocated"]);
  });

  it("creates the SPEC section 2b taxonomy", async () => {
    const dal = scopedTo(db, alice);
    const cats = await dal.categories();
    const subs = await dal.subcategories();
    expect(cats).toHaveLength(13);
    expect(subs).toHaveLength(54);
    expect(cats.filter((c) => c.kind === "income").map((c) => c.name)).toEqual(["Income"]);
    expect(cats.filter((c) => c.kind === "saving").map((c) => c.name)).toEqual(["Saving"]);

    const byName = Object.fromEntries(subs.map((s) => [s.name, s.defaultClassification]));
    expect(byName.Meal).toBe("needs");
    expect(byName.Coffee).toBe("wants");
    expect(byName["Zakat & Infaq"]).toBe("needs");
    expect(byName.Salary).toBeNull();
    expect(byName["Emergency Fund"]).toBeNull();
  });

  it("writes default settings", async () => {
    const row = await scopedTo(db, alice).settings();
    expect(row.defaultPayDay).toBe(25);
    expect(row.shortcuts).toEqual(DEFAULT_SHORTCUTS);
  });

  it("does nothing the second time, even after a rename", async () => {
    await db.update(envelopes).set({ name: "Makan" }).where(eq(envelopes.name, "Meal"));
    const again = await seedUser(db, "alice@example.com", "other-hash");
    expect(again).toEqual({ userId: alice, seeded: false });
    const names = (await scopedTo(db, alice).envelopes()).map((e) => e.name);
    expect(names).toContain("Makan");
    expect(names).not.toContain("Meal");
    await db.update(envelopes).set({ name: "Meal" }).where(eq(envelopes.name, "Makan"));
  });
});

describe("schema", () => {
  it("has both extensions and the trigram index", async () => {
    const ext = await db.execute(sql`select extname from pg_extension where extname in ('pg_trgm', 'btree_gist')`);
    expect(ext.rows).toHaveLength(2);
    const idx = await db.execute(
      sql`select indexdef from pg_indexes where indexname = 'transactions_item_trgm_idx'`,
    );
    expect(String(ext.rows.length && idx.rows[0]?.indexdef)).toContain("gin_trgm_ops");
  });

  it("rejects overlapping cycles for one user but not across users", async () => {
    await addCycle(alice, "2026-01-25", "2026-02-24");
    await expect(addCycle(alice, "2026-02-24", "2026-03-24")).rejects.toThrow();
    await expect(addCycle(bob, "2026-02-01", "2026-02-24")).resolves.toBeTruthy();
    await expect(addCycle(alice, "2026-02-25", "2026-03-24")).resolves.toBeTruthy();
  });

  it("lets neighbouring cycles move together inside one transaction", async () => {
    const first = await addCycle(alice, "2027-01-25", "2027-02-24");
    const second = await addCycle(alice, "2027-02-25", "2027-03-24");
    await db.transaction(async (tx) => {
      await tx.update(cycles).set({ startDate: "2027-02-20" }).where(eq(cycles.id, second.id));
      await tx.update(cycles).set({ endDate: "2027-02-19" }).where(eq(cycles.id, first.id));
    });
  });

  it("computes totals as whole rupiah", async () => {
    const cycle = await addCycle(alice, "2028-01-25", "2028-02-24");
    const [source] = await db.select().from(accounts).where(eq(accounts.name, "Cash")).limit(1);
    const [row] = await db
      .insert(transactions)
      .values({
        cycleId: cycle.id,
        date: "2028-01-26",
        item: "Pertalite",
        sourceAccountId: source.id,
        destAccountId: source.id,
        type: "expense",
        amount: 10_000,
        quantity: "2.255",
        discount: 500,
      })
      .returning();
    expect(row.total).toBe(22_050);
    expect(row.tags).toEqual([]);
    expect(row.isOpening).toBe(false);

    const [wish] = await db
      .insert(wishlist)
      .values({ userId: alice, item: "Helmet", price: 500_000, quantity: "2", discount: 50_000 })
      .returning();
    expect(wish.total).toBe(950_000);
  });

  it("rounds totals the same way as lineTotal in lib/finance", async () => {
    const cycle = await addCycle(alice, "2031-01-25", "2031-02-24");
    const [cash] = await db.select().from(accounts).where(eq(accounts.name, "Cash")).limit(1);
    const lines = [
      { quantity: "0.5", amount: 3_001, discount: 0 },
      { quantity: "0.5", amount: 1, discount: 1 },
      { quantity: "1.001", amount: 999, discount: 0 },
      { quantity: "22.5", amount: 13_333, discount: 7 },
      { quantity: "0.333", amount: 1_500, discount: 0 },
    ];
    const rows = await db
      .insert(transactions)
      .values(
        lines.map((l) => ({
          ...l,
          cycleId: cycle.id,
          date: "2031-01-26",
          item: "Rounding",
          sourceAccountId: cash.id,
          destAccountId: cash.id,
          type: "expense" as const,
        })),
      )
      .returning();
    expect(rows.map((r) => r.total)).toEqual(lines.map(lineTotal));
  });

  it("rejects a pay day outside 1 to 31", async () => {
    await expect(db.update(settings).set({ defaultPayDay: 32 }).where(eq(settings.userId, alice))).rejects.toThrow();
  });
});

describe("scopedTo", () => {
  it("hides one user's rows from another, including through a parent id", async () => {
    const cycle = await addCycle(alice, "2029-01-25", "2029-02-24");
    const [mine] = await scopedTo(db, alice).accounts();
    await db.insert(transactions).values({
      cycleId: cycle.id,
      date: "2029-01-26",
      item: "Only for Alice",
      sourceAccountId: mine.id,
      destAccountId: mine.id,
      type: "expense",
      amount: 1,
    });

    const asAlice = scopedTo(db, alice);
    const asBob = scopedTo(db, bob);
    expect(await asAlice.transactions(cycle.id)).toHaveLength(1);
    expect(await asBob.transactions(cycle.id)).toHaveLength(0);
    expect(await asBob.planItems(cycle.id)).toHaveLength(0);
    expect(await asBob.reconciliations(cycle.id)).toHaveLength(0);

    const ids = async (user: string) => ({
      accounts: (await scopedTo(db, user).accounts()).map((a) => a.id),
      categories: (await scopedTo(db, user).categories()).map((c) => c.id),
      subcategories: (await scopedTo(db, user).subcategories()).map((s) => s.id),
      cycles: (await scopedTo(db, user).cycles()).map((c) => c.id),
    });
    const [a, b] = [await ids(alice), await ids(bob)];
    for (const key of ["accounts", "categories", "subcategories", "cycles"] as const) {
      expect(a[key].filter((id) => b[key].includes(id))).toEqual([]);
    }
    expect((await asBob.cycles()).map((c) => c.id)).not.toContain(cycle.id);

    const bobCategories = await db.select().from(categories).where(eq(categories.userId, bob));
    const bobSubs = await asBob.subcategories();
    expect(bobSubs.every((s) => bobCategories.some((c) => c.id === s.categoryId))).toBe(true);
    expect(await db.select().from(subcategories)).toHaveLength(108);
  });
});

describe("Quick Record write path", () => {
  const ids = async (user: string) => {
    const dal = scopedTo(db, user);
    const accts = await dal.accounts();
    return {
      dal,
      cash: accts.find((a) => a.name === "Cash")!.id,
      external: accts.find((a) => a.kind === "external")!.id,
      unallocated: (await dal.envelopes()).find((e) => e.isSystem)!.id,
    };
  };
  const entry = (a: { cash: string; external: string }, over: object = {}) => ({
    id: crypto.randomUUID(),
    item: "Kopi susu",
    type: "expense",
    sourceAccountId: a.cash,
    destAccountId: a.external,
    amount: 18_000,
    date: "2032-03-01",
    ...over,
  });

  it("asks for a cycle, then starts one that ends the day before the next pay day", async () => {
    const a = await ids(alice);
    expect(await a.dal.addTransaction(entry(a))).toEqual({ ok: false, needsCycle: true });
    expect(await a.dal.startCycle("2032-03-02", "2032-03-01", 25)).toMatch(/on or before/);
    expect(await a.dal.startCycle("2032-02-25", "2032-03-01", 25)).toBeNull();
    const cycle = await a.dal.cycleOn("2032-03-01");
    expect([cycle?.startDate, cycle?.endDate, cycle?.name]).toEqual(["2032-02-25", "2032-03-24", "25 Feb – 24 Mar 2032"]);
  });

  it("closes the gap to the cycle before when the next one starts", async () => {
    const a = await ids(alice);
    expect(await a.dal.startCycle("2032-04-23", "2032-04-24", 25)).toBeNull();
    expect((await a.dal.cycleOn("2032-03-30"))?.endDate).toBe("2032-04-22");
    expect((await a.dal.cycleOn("2032-04-24"))?.endDate).toBe("2032-05-24");
  });

  it("saves once per id and stores Unallocated for an empty Budget", async () => {
    const a = await ids(alice);
    const input = entry(a);
    expect(await a.dal.addTransaction(input)).toEqual({ ok: true });
    expect(await a.dal.addTransaction(input)).toEqual({ ok: true });
    const rows = (await db.select().from(transactions).where(eq(transactions.id, input.id)));
    expect(rows).toHaveLength(1);
    expect([rows[0].sourceEnvelopeId, rows[0].destEnvelopeId]).toEqual([a.unallocated, a.unallocated]);
  });

  it("refuses another user's Fund and won't let them edit or undo the record", async () => {
    const a = await ids(alice);
    const b = await ids(bob);
    const theirs = await a.dal.addTransaction(entry(a, { sourceAccountId: b.cash }));
    expect(theirs.ok).toBe(false);
    expect("error" in theirs && theirs.error?.issues.map((i) => i.path[0])).toContain("sourceAccountId");

    const input = entry(a, { item: "Mine" });
    await a.dal.addTransaction(input);
    expect(await b.dal.updateTransaction({ ...entry(b), id: input.id })).toEqual({ ok: false, missing: true });
    await b.dal.deleteTransaction(input.id);
    expect(await db.select().from(transactions).where(eq(transactions.id, input.id))).toHaveLength(1);
    await a.dal.deleteTransaction(input.id);
    expect(await db.select().from(transactions).where(eq(transactions.id, input.id))).toHaveLength(0);
  });

  it("suggests past items fuzzily, ranked by use, each with its latest row", async () => {
    const a = await ids(alice);
    await a.dal.addTransaction(entry(a, { item: "Kopi susu", amount: 20_000, date: "2032-03-05" }));
    await a.dal.addTransaction(entry(a, { item: "Kopi hitam", date: "2032-03-02" }));
    const { history } = await a.dal.suggestItems("kopi", "2032-03-06", undefined);
    expect(history.map((h) => h.item)).toEqual(["Kopi susu", "Kopi hitam"]);
    expect(history[0].amount).toBe(20_000);
    expect((await a.dal.suggestItems("kopi susuu", "2032-03-06", undefined)).history[0]?.item).toBe("Kopi susu");
    expect((await scopedTo(db, bob).suggestItems("kopi", "2032-03-06", undefined)).history).toEqual([]);
  });

  it("refuses a cycle start that would orphan records of the cycle before", async () => {
    const a = await ids(alice);
    expect(await a.dal.startCycle("2032-03-04", "2032-03-30", 25)).toMatch(/already starts|records on or after/);
  });
});

describe("M4 cycles, plan and search", () => {
  let carol: string;
  let dal: ReturnType<typeof scopedTo>;
  let ids: { cash: string; jago: string; external: string; unallocated: string; meal: string; mealSub: string };
  const record = (over: object) => ({
    id: crypto.randomUUID(),
    item: "Nasi padang",
    type: "expense",
    sourceAccountId: ids.cash,
    destAccountId: ids.external,
    amount: 25_000,
    date: "2033-01-26",
    ...over,
  });

  beforeAll(async () => {
    carol = (await seedUser(db, "carol@example.com", "hash")).userId;
    dal = scopedTo(db, carol);
    const accts = await dal.accounts();
    const envs = await dal.envelopes();
    const subs = await dal.subcategories();
    ids = {
      cash: accts.find((a) => a.name === "Cash")!.id,
      jago: accts.find((a) => a.name === "Jago")!.id,
      external: accts.find((a) => a.kind === "external")!.id,
      unallocated: envs.find((e) => e.isSystem)!.id,
      meal: envs.find((e) => e.name === "Meal")!.id,
      mealSub: subs.find((s) => s.name === "Meal")!.id,
    };
    expect(await dal.startCycle("2033-01-25", "2033-01-25", 25)).toBeNull();
    const salary = { type: "income", sourceAccountId: ids.external, destAccountId: ids.jago, amount: 5_000_000, item: "Salary", date: "2033-01-25" };
    expect((await dal.addTransaction(record(salary))).ok).toBe(true);
    const allocate = { type: "transfer", sourceAccountId: ids.jago, destAccountId: ids.jago, sourceEnvelopeId: ids.unallocated, destEnvelopeId: ids.meal, amount: 600_000, item: "Allocate to Meal" };
    expect((await dal.addTransaction(record(allocate))).ok).toBe(true);
    // Meal money moved to Cash, then spent from Cash: Cash|Meal ends negative.
    const move = { type: "transfer", sourceAccountId: ids.jago, destAccountId: ids.cash, sourceEnvelopeId: ids.meal, destEnvelopeId: ids.meal, amount: 50_000, item: "Tarik tunai" };
    expect((await dal.addTransaction(record(move))).ok).toBe(true);
    expect((await dal.addTransaction(record({ sourceEnvelopeId: ids.meal, subcategoryId: ids.mealSub, amount: 75_000, tags: ["work trip"] }))).ok).toBe(true);
  });

  const cycleOf = async (date: string) => (await dal.cycleOn(date))!;

  it("saves, edits and copies plan items, checking pairings like a record", async () => {
    const cycle = await cycleOf("2033-01-26");
    const item = { id: crypto.randomUUID(), item: "Rent", type: "expense", sourceAccountId: ids.jago, destAccountId: ids.external, amount: 1_500_000, frequency: "monthly", date: "2033-02-01" };
    expect(await dal.savePlanItem(cycle.id, item, "add")).toEqual({ ok: true });
    expect((await dal.savePlanItem(cycle.id, { ...item, id: crypto.randomUUID(), destAccountId: ids.cash }, "add")).ok).toBe(false);
    expect(await dal.savePlanItem(cycle.id, { ...item, amount: 1_600_000, date: null }, "edit")).toEqual({ ok: true });
    const [saved] = await dal.planItems(cycle.id);
    expect([saved.amount, saved.date, saved.frequency, saved.sourceEnvelopeId]).toEqual([1_600_000, null, "monthly", ids.unallocated]);
    expect((await scopedTo(db, bob).savePlanItem(cycle.id, item, "edit")).ok).toBe(false);
    expect(await scopedTo(db, bob).deletePlanItem(saved.id)).toBeNull();
    await dal.savePlanItem(cycle.id, { ...item, id: crypto.randomUUID(), item: "Internet", amount: 300_000, date: "2033-02-03" }, "add");
  });

  it("filters transactions and keeps them to their owner", async () => {
    const all = { cycle: "all" } as const;
    expect((await dal.searchTransactions({ ...all, q: "padang" }, 50)).map((t) => t.item)).toEqual(["Nasi padang"]);
    expect(await dal.searchTransactions({ ...all, type: "transfer" }, 50)).toHaveLength(2);
    expect(await dal.searchTransactions({ ...all, tag: "work trip" }, 50)).toHaveLength(1);
    expect(await dal.searchTransactions({ ...all, fund: ids.cash }, 50)).toHaveLength(2);
    const food = (await dal.subcategories()).find((s) => s.id === ids.mealSub)!.categoryId;
    expect(await dal.searchTransactions({ ...all, category: food }, 50)).toHaveLength(1);
    expect(await dal.searchTransactions({ ...all, class: "none" }, 50)).toHaveLength(3);
    expect(await dal.tags()).toEqual(["work trip"]);
    expect(await scopedTo(db, bob).searchTransactions({ ...all, q: "padang" }, 50)).toEqual([]);
  });

  it("moves a pay day without gaps, and refuses one that strands records", async () => {
    expect(await dal.startCycle("2033-02-25", "2033-02-25", 25)).toBeNull();
    const second = await cycleOf("2033-02-25");
    expect(await dal.moveCycleStart(second.id, "2033-01-25")).toMatch(/on or before the start/);
    expect(await dal.moveCycleStart(second.id, "2033-01-26")).toMatch(/has records on or after/);
    expect(await dal.moveCycleStart(second.id, "2033-02-23")).toBeNull();
    expect((await cycleOf("2033-02-22")).endDate).toBe("2033-02-22");
    expect((await cycleOf("2033-02-23")).name).toBe("23 Feb – 24 Mar 2033");
    expect(await scopedTo(db, bob).moveCycleStart(second.id, "2033-02-20")).toMatch(/doesn't exist/);
  });

  it("closes a cycle: locks it, carries each Fund and Budget pair over, copies the plan", async () => {
    const first = await cycleOf("2033-01-26");
    const second = await cycleOf("2033-02-23");
    expect(await dal.closeCycle(second.id, "2033-03-25", 25)).toMatchObject({ error: expect.stringMatching(/first/) });
    expect(await dal.closeCycle(first.id, "ignored", 25)).toMatchObject({ error: null });
    expect((await cycleOf("2033-01-26")).status).toBe("closed");

    const opening = (await dal.transactions(second.id)).filter((t) => t.isOpening);
    const pairs = Object.fromEntries(opening.map((t) => [`${t.destAccountId}|${t.destEnvelopeId}`, t.amount]));
    expect(pairs).toEqual({
      [`${ids.jago}|${ids.unallocated}`]: 4_400_000,
      [`${ids.jago}|${ids.meal}`]: 550_000,
      [`${ids.cash}|${ids.meal}`]: -25_000,
    });
    expect(opening.every((t) => t.type === "income" && t.sourceAccountId === ids.external && t.date === "2033-02-23")).toBe(true);

    // The plan came along, with dates moved by the 29 days between the starts.
    const plan = await dal.planItems(second.id);
    expect(plan.map((p) => [p.item, p.date])).toEqual([["Rent", null], ["Internet", "2033-03-04"]]);
  });

  it("refuses every write to a closed cycle", async () => {
    const first = await cycleOf("2033-01-26");
    const [row] = (await dal.transactions(first.id)).filter((t) => t.item === "Nasi padang");
    expect(await dal.addTransaction(record({}))).toEqual({ ok: false, closed: true });
    expect(await dal.updateTransaction(record({ id: row.id, date: "2033-02-24" }))).toEqual({ ok: false, closed: true });
    expect(await dal.deleteTransaction(row.id)).toBe(false);
    const [planned] = await dal.planItems(first.id);
    expect(await dal.deletePlanItem(planned.id)).toBeNull();
    expect(await dal.savePlanItem(first.id, { ...planned, id: crypto.randomUUID() }, "add")).toEqual({ ok: false, closed: true });
    expect(await dal.copyPreviousPlan(first.id)).toMatch(/closed/);
    expect(await dal.moveCycleStart(first.id, "2033-01-24")).toMatch(/closed/);
    expect(await dal.closeCycle(first.id, "2033-02-23", 25)).toMatchObject({ error: expect.stringMatching(/already closed/) });
  });

  it("moves opening rows with the pay day, and creates the next cycle on close", async () => {
    const second = await cycleOf("2033-02-23");
    expect(await dal.moveCycleStart(second.id, "2033-02-24")).toBeNull();
    expect((await dal.transactions(second.id)).filter((t) => t.isOpening).every((t) => t.date === "2033-02-24")).toBe(true);
    expect((await cycleOf("2033-02-23")).status).toBe("closed");

    expect(await dal.closeCycle(second.id, "2033-03-24", 25)).toMatchObject({ error: null });
    const third = await cycleOf("2033-03-24");
    expect([third.startDate, third.endDate, third.status]).toEqual(["2033-03-24", "2033-04-24", "open"]);
    expect((await cycleOf("2033-03-23")).endDate).toBe("2033-03-23");
    expect((await dal.transactions(third.id)).filter((t) => t.isOpening)).toHaveLength(3);
  });
});

describe("M5 supporting screens", () => {
  let dave: string;
  let dal: ReturnType<typeof scopedTo>;
  let cash: string;

  beforeAll(async () => {
    dave = (await seedUser(db, "dave@example.com", "hash")).userId;
    dal = scopedTo(db, dave);
    cash = (await dal.accounts()).find((a) => a.name === "Cash")!.id;
    expect(await dal.startCycle("2034-01-25", "2034-01-25", 25)).toBeNull();
  });

  it("saves counts newest first and refuses other users' Funds and closed cycles", async () => {
    const [cycle] = await dal.cycles();
    expect(await dal.addCount(cycle.id, { accountId: cash, counted: 100_000 })).toBeNull();
    expect(await dal.addCount(cycle.id, { accountId: cash, counted: 120_000, note: "after lunch" })).toBeNull();
    expect((await dal.reconciliations(cycle.id)).map((c) => c.countedBalance)).toEqual([120_000, 100_000]);
    const bobCash = (await scopedTo(db, bob).accounts()).find((a) => a.name === "Cash")!.id;
    expect(await dal.addCount(cycle.id, { accountId: bobCash, counted: 1 })).toMatch(/your Funds/);
    expect(await scopedTo(db, bob).addCount(cycle.id, { accountId: bobCash, counted: 1 })).toMatch(/doesn't exist/);
    await db.update(cycles).set({ status: "closed" }).where(eq(cycles.id, cycle.id));
    expect(await dal.addCount(cycle.id, { accountId: cash, counted: 1 })).toMatch(/closed/);
    expect(await dal.deleteCount((await dal.reconciliations(cycle.id))[0].id)).toBe(false);
    await db.update(cycles).set({ status: "open" }).where(eq(cycles.id, cycle.id));
  });

  it("signs borrows and settles a person only at zero", async () => {
    const row = { person: "Rina", item: "Dinner", amount: 50_000, date: "2034-01-26" };
    expect(await dal.addBorrow({ ...row, direction: "out" })).toBeNull();
    expect(await dal.settleBorrows("Rina")).toMatch(/isn't zero/);
    expect(await dal.addBorrow({ ...row, item: "Paid back", direction: "in" })).toBeNull();
    expect((await dal.borrows()).map((b) => [b.lender, b.lendee, b.amount])).toEqual(
      expect.arrayContaining([["Me", "Rina", 50_000], ["Rina", "Me", -50_000]]),
    );
    expect(await scopedTo(db, bob).settleBorrows("Rina")).toMatch(/Nothing open/);
    expect(await dal.settleBorrows("Rina")).toBeNull();
    expect((await dal.borrows()).every((b) => b.settled)).toBe(true);
    expect(await dal.addBorrow({ ...row, person: "me", direction: "out" })).toMatch(/other person/);
  });

  it("adds, edits and toggles wishes for their owner only", async () => {
    const id = crypto.randomUUID();
    const wish = { id, item: "Keyboard", price: 1_250_000, priority: 1 };
    expect(await dal.saveWish(wish)).toBeNull();
    expect(await dal.saveWish({ ...wish, price: 1_100_000, discount: 100_000 })).toBeNull();
    expect((await dal.wishlist())[0]).toMatchObject({ price: 1_100_000, total: 1_000_000 });
    expect(await scopedTo(db, bob).saveWish({ ...wish, item: "Taken" })).toBeNull();
    expect((await dal.wishlist())[0].item).toBe("Keyboard");
    expect(await scopedTo(db, bob).setAcquired(id, true)).toBe(false);
    expect(await dal.setAcquired(id, true)).toBe(true);
    expect(await dal.saveWish({ ...wish, id: crypto.randomUUID(), discount: 2_000_000 })).toMatch(/discount/);
  });

  it("gives a new Budget its own hue and keeps hues through a reorder", async () => {
    expect(await dal.saveEnvelope(null, { name: "Holiday" })).toBeNull();
    const before = await dal.envelopes();
    const holiday = before.find((e) => e.name === "Holiday")!;
    // 13 seeded Budgets use hues 0 to 5 round-robin, so the least used is 1.
    expect(holiday.hue).toBe(1);
    expect(await dal.reorder("envelopes", before.map((e) => e.id).reverse())).toBeNull();
    const after = await dal.envelopes();
    expect(after[0].name).toBe("Holiday");
    expect(after.map((e) => [e.id, e.hue]).sort()).toEqual(before.map((e) => [e.id, e.hue]).sort());
    expect(await dal.reorder("envelopes", after.map((e) => e.id).slice(1))).toMatch(/changed/);
    const bobEnv = (await scopedTo(db, bob).envelopes())[0].id;
    expect(await dal.reorder("envelopes", [...after.map((e) => e.id).slice(1), bobEnv])).toMatch(/changed/);
  });

  it("deletes only unused, non-system Budgets", async () => {
    const envs = await dal.envelopes();
    expect(await dal.deleteEnvelope(envs.find((e) => e.isSystem)!.id)).toMatch(/can't be deleted/);
    expect(await dal.deleteEnvelope(envs.find((e) => e.name === "Holiday")!.id)).toBeNull();
    expect(await scopedTo(db, bob).deleteEnvelope(envs.find((e) => e.name === "Meal")!.id)).toMatch(/doesn't exist/);
  });

  it("edits Funds and subcategories but not External or another user's rows", async () => {
    const accts = await dal.accounts();
    expect(await dal.saveAccount(cash, { minBalance: 20_000, countsAsUsable: false })).toBeNull();
    expect((await dal.accounts()).find((a) => a.id === cash)).toMatchObject({ minBalance: 20_000, countsAsUsable: false });
    expect(await dal.saveAccount(accts.find((a) => a.kind === "external")!.id, { name: "Shop" })).toMatch(/can't be changed/);
    expect(await scopedTo(db, bob).saveAccount(cash, { name: "Mine" })).toMatch(/can't be changed/);
    const sub = (await dal.subcategories()).find((s) => s.name === "Meal")!;
    const meal = (await dal.envelopes()).find((e) => e.name === "Meal")!.id;
    expect(await dal.saveSubcategory(sub.id, sub.categoryId, { defaultEnvelopeId: meal })).toBeNull();
    const bobMeal = (await scopedTo(db, bob).envelopes()).find((e) => e.name === "Meal")!.id;
    expect(await dal.saveSubcategory(sub.id, sub.categoryId, { defaultEnvelopeId: bobMeal })).toMatch(/your Budgets/);
  });

  it("stores pay day and shortcuts, refusing clashes and typing-hostile keys", async () => {
    expect(await dal.setPayDay(28)).toBeNull();
    expect(await dal.setPayDay(32)).toMatch(/1 to 31/);
    expect(await dal.setShortcuts({ ...DEFAULT_SHORTCUTS, openQuickRecord: "n" })).toBeNull();
    expect(await dal.settings()).toMatchObject({ defaultPayDay: 28, shortcuts: { openQuickRecord: "n" } });
    expect(await dal.setShortcuts({ ...DEFAULT_SHORTCUTS, close: "mod+enter" })).toMatch(/share/);
    expect(await dal.setShortcuts({ ...DEFAULT_SHORTCUTS, close: "x" })).toMatch(/Ctrl/);
  });
});
