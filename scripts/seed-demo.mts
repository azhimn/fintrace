// Creates a non-admin login with two cycles of made-up records for testing. Goes through the DAL,
// so every row passes the same checks as the app, and closing the first cycle makes real carry-over rows.
import { eq } from "drizzle-orm";
import { scopedTo } from "@/lib/dal";
import { db } from "@/lib/db";
import { categories, cycles, subcategories } from "@/lib/db/schema";
import { seedUser } from "@/lib/db/seed";
import { hashPassword } from "@/lib/password";
import { addDays } from "@/lib/calendar";

const name = process.env.DEMO_USERNAME || "demo";
const password = process.env.DEMO_PASSWORD || "demo1234";
const PAY_DAY = 25;
const FIRST = "2026-09-25";
const SECOND = "2026-10-25";
const LAST_DAY = "2026-11-24";

const { userId, seeded } = await seedUser(db, name, await hashPassword(password));
if (!seeded) {
  console.error(`${name} already exists. Delete it under Settings, Users (or pick DEMO_USERNAME) and run this again.`);
  process.exit(1);
}
const dal = scopedTo(db, userId);

// Every DAL write answers null or { ok: true } on success; anything else stops the seed.
const must = (what: string, result: unknown) => {
  const r = result as { ok?: boolean; error?: unknown } | string | null;
  if (r === null || (typeof r === "object" && (r.ok === true || (r.ok === undefined && !r.error)))) return;
  throw new Error(`${what}: ${JSON.stringify(r)}`);
};

const fund = Object.fromEntries((await dal.accounts()).map((a) => [a.name, a.id]));
const budget = Object.fromEntries((await dal.envelopes()).map((e) => [e.name, e.id]));
const sub = Object.fromEntries(
  (
    await db
      .select({ id: subcategories.id, name: subcategories.name })
      .from(subcategories)
      .innerJoin(categories, eq(categories.id, subcategories.categoryId))
      .where(eq(categories.userId, userId))
  ).map((s) => [s.name, s.id]),
);

// Seeded so every run makes the same data.
let seed = 42;
const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
const between = (lo: number, hi: number) => Math.round((lo + rand() * (hi - lo)) / 500) * 500;

type Row = {
  item: string;
  type: "income" | "expense" | "saving" | "transfer";
  from: string;
  to: string;
  amount: number;
  fromBudget?: string;
  toBudget?: string;
  sub?: string;
  quantity?: string;
  location?: string;
  tags?: string[];
};
const input = (r: Row) => ({
  id: crypto.randomUUID(),
  item: r.item,
  type: r.type,
  sourceAccountId: fund[r.from],
  destAccountId: fund[r.to],
  sourceEnvelopeId: r.fromBudget ? budget[r.fromBudget] : null,
  destEnvelopeId: r.toBudget ? budget[r.toBudget] : null,
  subcategoryId: r.sub ? sub[r.sub] : null,
  amount: r.amount,
  quantity: r.quantity ?? "1",
  location: r.location,
  tags: r.tags ?? [],
});

const ALLOCATIONS: [string, string, number][] = [
  ["Jago", "Meal", 1_400_000],
  ["Jago", "Fuel", 300_000],
  ["Jago", "Wants", 400_000],
  ["Jago", "Pet Care", 200_000],
  ["Mandiri", "Housing Rent", 1_000_000],
  ["Mandiri", "Electricity", 250_000],
  ["Mandiri", "Internet", 300_000],
  ["Mandiri", "Investment", 500_000],
  ["Mandiri", "Personal Care", 150_000],
];
const allocation = ([f, b, amount]: [string, string, number]): Row => ({
  item: `Allocate to ${b}`, type: "transfer", from: f, to: f, fromBudget: "Unallocated", toBudget: b, amount,
});

async function recordCycle(start: string, days: number, sideJob: boolean) {
  const on: [number, Row][] = [
    [0, { item: "Salary", type: "income", from: "External", to: "Mandiri", sub: "Salary", amount: 5_500_000 }],
    [0, { item: "Move to Jago", type: "transfer", from: "Mandiri", to: "Jago", amount: 2_500_000 }],
    ...ALLOCATIONS.map((a): [number, Row] => [0, allocation(a)]),
    [1, { item: "Cash withdrawal", type: "transfer", from: "Jago", to: "Cash", fromBudget: "Meal", toBudget: "Meal", amount: 900_000 }],
    [1, { item: "Mutual fund top-up", type: "saving", from: "Mandiri", to: "External", fromBudget: "Investment", sub: "Investment – Mutual Funds", amount: 500_000 }],
    [2, { item: "Room rent", type: "expense", from: "Mandiri", to: "External", fromBudget: "Housing Rent", sub: "Rent", amount: 1_000_000 }],
    [3, { item: "Home internet", type: "expense", from: "Mandiri", to: "External", fromBudget: "Internet", sub: "Internet & Mobile Data", amount: 300_000 }],
    [5, { item: "Electricity token", type: "expense", from: "Mandiri", to: "External", fromBudget: "Electricity", sub: "Electricity", amount: 200_000 }],
    [10, { item: "Cat food", type: "expense", from: "Jago", to: "External", fromBudget: "Pet Care", sub: "Pet Food", amount: 120_000, location: "Petshop" }],
    [12, { item: "Groceries", type: "expense", from: "Cash", to: "External", fromBudget: "Meal", sub: "Groceries", amount: between(70_000, 110_000), location: "Indomaret" }],
    [14, { item: "Facial wash", type: "expense", from: "Mandiri", to: "External", fromBudget: "Personal Care", sub: "Skincare & Cosmetics", amount: 95_000 }],
    // No category on purpose, so Analytics shows Uncategorised.
    [18, { item: "Phone case", type: "expense", from: "Jago", to: "External", fromBudget: "Wants", amount: 45_000 }],
  ];
  if (sideJob) on.push([15, { item: "Logo design", type: "income", from: "External", to: "Jago", sub: "Side Job / Freelance", amount: 750_000 }]);
  for (let d = 0; d < days; d++) {
    on.push([d, { item: "Lunch", type: "expense", from: "Cash", to: "External", fromBudget: "Meal", sub: "Meal", amount: between(15_000, 25_000), location: "Warteg" }]);
    if (d % 3 === 1) on.push([d, { item: "Iced coffee", type: "expense", from: "Jago", to: "External", fromBudget: "Wants", sub: "Coffee", amount: between(25_000, 45_000), tags: d % 2 ? ["with friends"] : [] }]);
    if (d % 7 === 2) on.push([d, { item: "Pertalite", type: "expense", from: "Jago", to: "External", fromBudget: "Fuel", sub: "Fuel", amount: 10_000, quantity: (4 + rand() * 2).toFixed(2), location: "SPBU" }]);
  }
  for (const [d, row] of on) {
    const date = addDays(start, d);
    if (date <= LAST_DAY) must(`${row.item} on ${date}`, await dal.addTransaction({ ...input(row), date }));
  }
}

// Cycle 1: plan, records, then close it so cycle 2 gets carry-over rows and a copy of the plan.
must("start cycle", await dal.startCycle(FIRST, FIRST, PAY_DAY));
const [first] = await db.select().from(cycles).where(eq(cycles.userId, userId));
const plan: (Row & { frequency: string })[] = [
  { item: "Salary", type: "income", from: "External", to: "Mandiri", sub: "Salary", amount: 5_500_000, frequency: "monthly" },
  ...ALLOCATIONS.map((a) => ({ ...allocation(a), frequency: "monthly" })),
  { item: "Lunch", type: "expense", from: "Cash", to: "External", fromBudget: "Meal", sub: "Meal", amount: 20_000, quantity: "30", frequency: "once" },
  { item: "Pertalite", type: "expense", from: "Jago", to: "External", fromBudget: "Fuel", sub: "Fuel", amount: 60_000, quantity: "4", frequency: "weekly" },
  { item: "Iced coffee", type: "expense", from: "Jago", to: "External", fromBudget: "Wants", sub: "Coffee", amount: 35_000, quantity: "10", frequency: "once" },
  { item: "Room rent", type: "expense", from: "Mandiri", to: "External", fromBudget: "Housing Rent", sub: "Rent", amount: 1_000_000, frequency: "monthly" },
  { item: "Mutual fund top-up", type: "saving", from: "Mandiri", to: "External", fromBudget: "Investment", sub: "Investment – Mutual Funds", amount: 500_000, frequency: "monthly" },
];
for (const p of plan) must(`plan ${p.item}`, await dal.savePlanItem(first.id, { ...input(p), frequency: p.frequency }, "add"));
await recordCycle(FIRST, 30, false);
must("close cycle", await dal.closeCycle(first.id, SECOND, PAY_DAY));

// Cycle 2, the open one: records up to today, one Cash count, borrows and a wishlist.
await recordCycle(SECOND, 31, true);
const [second] = (await db.select().from(cycles).where(eq(cycles.userId, userId))).filter((c) => c.status === "open");
must("count", await dal.addCount(second.id, { accountId: fund.Cash, counted: 250_000, note: "Wallet count" }));

const borrow = (person: string, direction: "out" | "in", item: string, amount: number, date: string) =>
  dal.addBorrow({ person, direction, item, amount, date, sourceAccountId: fund.Cash, envelopeId: budget.Wants });
must("borrow", await borrow("Raka", "out", "Concert ticket", 100_000, "2026-10-02"));
must("borrow", await borrow("Raka", "in", "Paid back", 100_000, "2026-10-09"));
must("settle", await dal.settleBorrows("Raka"));
must("borrow", await borrow("Dita", "out", "Dinner split", 250_000, "2026-11-10"));
must("borrow", await borrow("Dita", "in", "Part payment", 100_000, "2026-11-18"));
must("borrow", await borrow("Bayu", "in", "Fuel money", 50_000, "2026-11-15"));

const wishes = [
  { item: "Mechanical keyboard", price: 850_000, category: "QoL", priority: 1, reason: "Typing all day" },
  { item: "Online course", price: 300_000, category: "Self Improvement", priority: 1, relativePriority: 2 },
  { item: "Running shoes", price: 650_000, category: "Fashion", priority: 2, discount: 50_000 },
  { item: "Chain lube", price: 45_000, category: "Maintenance", priority: 3, quantity: "2" },
  { item: "Music subscription", price: 55_000, category: "QoL", priority: 2, time: "Monthly" },
];
for (const w of wishes) must(`wish ${w.item}`, await dal.saveWish({ id: crypto.randomUUID(), ...w }));

console.log(`Created ${name} (password: ${password}) with two cycles of demo data.`);
await db.$client.end();
