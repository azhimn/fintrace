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
