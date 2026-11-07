import { describe, expect, it } from "vitest";
import {
  type Account,
  type PlanItem,
  type Txn,
  accountBalances,
  borrowBalances,
  cycleDays,
  envelopeBalances,
  lineTotal,
  needsVsWants,
  pairBalances,
  planVsActual,
  projectedRemainder,
  reconcile,
  runningBalance,
  subcategoryAnalysis,
  totalFunds,
  usableFunds,
} from "./finance";

// Fixture cycle 25 Sep – 22 Oct 2026: 28 days, so exactly 4 weeks.
const cycle = { startDate: "2026-09-25", endDate: "2026-10-22" };

const accounts: Account[] = [
  { id: "cash", kind: "cash", minBalance: 0, countsAsUsable: true },
  { id: "mandiri", kind: "bank", minBalance: 37_000, countsAsUsable: true },
  { id: "jago", kind: "bank", minBalance: 0, countsAsUsable: true },
  { id: "dana", kind: "e_wallet", minBalance: 0, countsAsUsable: false },
  { id: "external", kind: "external", minBalance: 0, countsAsUsable: false },
];
const envelopes = ["unallocated", "meal", "fuel", "wants", "investment"];
const subcategories = [
  { id: "meal", categoryId: "food" },
  { id: "coffee", categoryId: "food" },
  { id: "fuel", categoryId: "transport" },
  { id: "parking", categoryId: "transport" },
  { id: "emergency", categoryId: "saving" },
];

const row = (r: Partial<Txn> & Pick<Txn, "type" | "sourceAccountId" | "destAccountId" | "amount">): Txn => ({
  quantity: "1",
  discount: 0,
  sourceEnvelopeId: null,
  destEnvelopeId: null,
  isOpening: false,
  subcategoryId: null,
  classification: null,
  tags: [],
  planItemId: null,
  ...r,
});

// In date order, as the DAL returns them.
const txns: Txn[] = [
  row({ type: "income", sourceAccountId: "external", destAccountId: "jago", destEnvelopeId: "unallocated", amount: 500_000, isOpening: true }),
  row({ type: "income", sourceAccountId: "external", destAccountId: "cash", destEnvelopeId: "meal", amount: 100_000, isOpening: true }),
  row({ type: "income", sourceAccountId: "external", destAccountId: "dana", destEnvelopeId: "wants", amount: 50_000, isOpening: true }),
  row({ type: "income", sourceAccountId: "external", destAccountId: "mandiri", destEnvelopeId: "unallocated", amount: 3_789_316, planItemId: "p-salary" }),
  // Account move inside Unallocated.
  row({ type: "transfer", sourceAccountId: "mandiri", sourceEnvelopeId: "unallocated", destAccountId: "jago", destEnvelopeId: "unallocated", amount: 1_000_000 }),
  // Allocations: same account, different envelope.
  row({ type: "transfer", sourceAccountId: "jago", sourceEnvelopeId: "unallocated", destAccountId: "jago", destEnvelopeId: "meal", amount: 600_000 }),
  row({ type: "transfer", sourceAccountId: "jago", sourceEnvelopeId: "unallocated", destAccountId: "jago", destEnvelopeId: "fuel", amount: 200_000 }),
  row({ type: "transfer", sourceAccountId: "mandiri", sourceEnvelopeId: "unallocated", destAccountId: "mandiri", destEnvelopeId: "wants", amount: 300_000 }),
  row({ type: "expense", sourceAccountId: "jago", sourceEnvelopeId: "meal", destAccountId: "external", amount: 25_000, quantity: "2", discount: 5_000, subcategoryId: "meal", classification: "needs", planItemId: "p-meal" }),
  row({ type: "expense", sourceAccountId: "cash", sourceEnvelopeId: "meal", destAccountId: "external", amount: 30_000, subcategoryId: "meal", classification: "needs", planItemId: "p-meal" }),
  row({ type: "expense", sourceAccountId: "jago", sourceEnvelopeId: "fuel", destAccountId: "external", amount: 10_000, quantity: "2.345", subcategoryId: "fuel", classification: "needs", planItemId: "p-fuel" }),
  row({ type: "expense", sourceAccountId: "mandiri", sourceEnvelopeId: "wants", destAccountId: "external", amount: 35_000, subcategoryId: "coffee", classification: "wants", tags: ["with friends"], planItemId: "p-coffee" }),
  // Uncategorised.
  row({ type: "expense", sourceAccountId: "mandiri", sourceEnvelopeId: "wants", destAccountId: "external", amount: 15_000, classification: "wants" }),
  row({ type: "saving", sourceAccountId: "mandiri", sourceEnvelopeId: "unallocated", destAccountId: "external", destEnvelopeId: "investment", amount: 500_000, subcategoryId: "emergency", planItemId: "p-emergency" }),
  // Account move inside Meal.
  row({ type: "transfer", sourceAccountId: "jago", sourceEnvelopeId: "meal", destAccountId: "cash", destEnvelopeId: "meal", amount: 50_000 }),
  // 0,5 × 3.001 = 1.500,5 rounds to 1.501.
  row({ type: "expense", sourceAccountId: "cash", sourceEnvelopeId: "fuel", destAccountId: "external", amount: 3_001, quantity: "0.5", subcategoryId: "parking", classification: "needs" }),
];

const plan: PlanItem[] = [
  { id: "p-salary", type: "income", sourceAccountId: "external", destAccountId: "mandiri", sourceEnvelopeId: null, destEnvelopeId: "unallocated", quantity: "1", amount: 3_789_316, discount: 0 },
  { id: "p-meal", type: "expense", sourceAccountId: "jago", destAccountId: "external", sourceEnvelopeId: "meal", destEnvelopeId: null, quantity: "28", amount: 25_000, discount: 0 },
  { id: "p-fuel", type: "expense", sourceAccountId: "jago", destAccountId: "external", sourceEnvelopeId: "fuel", destEnvelopeId: null, quantity: "1", amount: 200_000, discount: 0 },
  { id: "p-coffee", type: "expense", sourceAccountId: "mandiri", destAccountId: "external", sourceEnvelopeId: "wants", destEnvelopeId: null, quantity: "4", amount: 35_000, discount: 10_000 },
  { id: "p-alloc", type: "transfer", sourceAccountId: "jago", destAccountId: "jago", sourceEnvelopeId: "unallocated", destEnvelopeId: "meal", quantity: "1", amount: 700_000, discount: 0 },
  { id: "p-emergency", type: "saving", sourceAccountId: "mandiri", destAccountId: "external", sourceEnvelopeId: "unallocated", destEnvelopeId: null, quantity: "1", amount: 500_000, discount: 0 },
];

const balances = accountBalances(accounts, txns);
const TOTAL = 3_789_365;

describe("lineTotal", () => {
  it("is round(quantity × amount − discount), half away from zero", () => {
    expect(lineTotal({ quantity: "2", amount: 25_000, discount: 5_000 })).toBe(45_000);
    expect(lineTotal({ quantity: "2.345", amount: 10_000, discount: 0 })).toBe(23_450);
    expect(lineTotal({ quantity: "0.5", amount: 3_001, discount: 0 })).toBe(1_501);
    expect(lineTotal({ quantity: "0.5", amount: 1, discount: 1 })).toBe(-1);
    expect(lineTotal({ quantity: "1.001", amount: 999, discount: 0 })).toBe(1_000);
  });
});

describe("account balances", () => {
  it("applies opening, income, transfers, expenses and savings", () => {
    expect(Object.fromEntries(balances)).toEqual({
      cash: 100_000 - 30_000 + 50_000 - 1_501,
      mandiri: 3_789_316 - 1_000_000 - 35_000 - 15_000 - 500_000,
      jago: 500_000 + 1_000_000 - 45_000 - 23_450 - 50_000,
      dana: 50_000,
    });
  });

  it("gives External no balance", () => {
    expect(balances.has("external")).toBe(false);
  });

  it("deducts a saving from the source only", () => {
    const saving = row({ type: "saving", sourceAccountId: "mandiri", destAccountId: "jago", amount: 1_000 });
    expect(Object.fromEntries(accountBalances(accounts, [saving]))).toMatchObject({ mandiri: -1_000, jago: 0 });
  });
});

describe("total and usable funds", () => {
  it("sums non-external balances", () => {
    expect(totalFunds(balances)).toBe(TOTAL);
  });

  it("sums usable accounts above their minimum balance", () => {
    expect(usableFunds(accounts, balances)).toBe(118_499 + 2_239_316 - 37_000 + 1_381_550);
  });
});

describe("running balance", () => {
  it("adds income, subtracts spending and ignores transfers", () => {
    const run = runningBalance(txns);
    expect(run.slice(0, 5)).toEqual([500_000, 600_000, 650_000, 4_439_316, 4_439_316]);
    expect(run.at(-1)).toBe(TOTAL);
  });

  it("gives the plan's Expected Funds and projected remainder", () => {
    expect(runningBalance(plan)).toEqual([3_789_316, 3_089_316, 2_889_316, 2_759_316, 2_759_316, 2_259_316]);
    expect(projectedRemainder(plan)).toBe(2_259_316);
    expect(projectedRemainder([])).toBe(0);
  });
});

describe("envelope balances", () => {
  const envs = envelopeBalances(envelopes, txns, plan);

  it("computes planned, allocated, spent, moved out and remaining", () => {
    expect(envs.get("unallocated")).toEqual({
      planned: 500_000,
      allocated: 500_000 + 3_789_316,
      spent: 500_000,
      movedOut: 1_100_000,
      remaining: 2_689_316,
      used: 500_000 / 4_289_316,
      overBudget: false,
    });
    expect(envs.get("meal")).toMatchObject({ planned: 700_000, allocated: 700_000, spent: 75_000, movedOut: 0, remaining: 625_000 });
    expect(envs.get("fuel")).toMatchObject({ planned: 200_000, allocated: 200_000, spent: 24_951, remaining: 175_049 });
    expect(envs.get("wants")).toMatchObject({ planned: 130_000, allocated: 350_000, spent: 50_000, remaining: 300_000 });
  });

  it("ignores a saving's destination envelope", () => {
    expect(envs.get("investment")).toEqual({ planned: 0, allocated: 0, spent: 0, movedOut: 0, remaining: 0, used: null, overBudget: false });
  });

  it("adds up to total funds", () => {
    expect([...envs.values()].reduce((s, e) => s + e.remaining, 0)).toBe(TOTAL);
  });

  it("subtracts transfers out and flags overspending", () => {
    const over = envelopeBalances(["fuel"], [
      ...txns,
      row({ type: "transfer", sourceAccountId: "jago", sourceEnvelopeId: "fuel", destAccountId: "jago", destEnvelopeId: "meal", amount: 100_000 }),
      row({ type: "expense", sourceAccountId: "jago", sourceEnvelopeId: "fuel", destAccountId: "external", amount: 80_000 }),
    ], []).get("fuel")!;
    expect(over).toMatchObject({ movedOut: 100_000, remaining: -4_951, overBudget: true });
  });
});

describe("reconcile", () => {
  const counts = [
    { accountId: "mandiri", countedBalance: 1_000_000, countedAt: new Date("2026-10-01T10:00:00Z") },
    { accountId: "mandiri", countedBalance: 2_240_000, countedAt: new Date("2026-10-20T10:00:00Z") },
    { accountId: "cash", countedBalance: 118_000, countedAt: new Date("2026-10-20T10:00:00Z") },
    { accountId: "dana", countedBalance: 49_000, countedAt: new Date("2026-10-20T10:00:00Z") },
  ];

  it("gives counted − computed per account, in total and for usable accounts", () => {
    const result = reconcile(accounts, balances, counts);
    expect(result.rows).toEqual([
      { accountId: "mandiri", counted: 2_240_000, computed: 2_239_316, difference: 684 },
      { accountId: "cash", counted: 118_000, computed: 118_499, difference: -499 },
      { accountId: "dana", counted: 49_000, computed: 50_000, difference: -1_000 },
    ]);
    expect(result.total).toBe(-815);
    expect(result.usable).toBe(185);
  });
});

describe("needs vs wants", () => {
  it("groups expense and saving by classification and category", () => {
    expect(cycleDays(cycle)).toBe(28);
    const [needs, wants, unclassified] = needsVsWants(txns, subcategories, cycleDays(cycle));
    expect(needs.classification).toBe("needs");
    expect(needs.categories).toEqual([
      { categoryId: "food", spent: 75_000, times: 2, avgTimesPerWeek: 0.5, avgPerSpend: 37_500, spentPerWeek: 18_750 },
      { categoryId: "transport", spent: 24_951, times: 2, avgTimesPerWeek: 0.5, avgPerSpend: 12_475.5, spentPerWeek: 6_237.75 },
    ]);
    expect(needs.total).toEqual({ spent: 99_951, times: 4, avgTimesPerWeek: 1, avgPerSpend: 24_987.75, spentPerWeek: 24_987.75 });

    expect(wants.classification).toBe("wants");
    expect(wants.categories.map((c) => [c.categoryId, c.spent, c.times])).toEqual([
      ["food", 35_000, 1],
      [null, 15_000, 1], // Uncategorised
    ]);
    expect(wants.total).toMatchObject({ spent: 50_000, times: 2 });

    expect(unclassified.classification).toBeNull();
    expect(unclassified.categories.map((c) => [c.categoryId, c.spent])).toEqual([["saving", 500_000]]);
  });

  it("returns no groups without spending", () => {
    expect(needsVsWants([], subcategories, 28)).toEqual([]);
  });
});

describe("subcategory analysis", () => {
  it("totals expenses per category and subcategory", () => {
    expect(subcategoryAnalysis(txns, subcategories)).toEqual([
      { categoryId: "food", total: 110_000, count: 3, subcategories: [{ subcategoryId: "meal", total: 75_000, count: 2 }, { subcategoryId: "coffee", total: 35_000, count: 1 }] },
      { categoryId: "transport", total: 24_951, count: 2, subcategories: [{ subcategoryId: "fuel", total: 23_450, count: 1 }, { subcategoryId: "parking", total: 1_501, count: 1 }] },
      { categoryId: null, total: 15_000, count: 1, subcategories: [{ subcategoryId: null, total: 15_000, count: 1 }] },
    ]);
  });

  it("filters by tag", () => {
    expect(subcategoryAnalysis(txns, subcategories, "with friends")).toEqual([
      { categoryId: "food", total: 35_000, count: 1, subcategories: [{ subcategoryId: "coffee", total: 35_000, count: 1 }] },
    ]);
  });
});

describe("plan vs actual", () => {
  const result = planVsActual(envelopes, plan, txns);

  it("compares each plan item with its linked transactions", () => {
    expect(result.items).toEqual([
      { planItemId: "p-salary", planned: 3_789_316, actual: 3_789_316, variance: 0 },
      { planItemId: "p-meal", planned: 700_000, actual: 75_000, variance: 625_000 },
      { planItemId: "p-fuel", planned: 200_000, actual: 23_450, variance: 176_550 },
      { planItemId: "p-coffee", planned: 130_000, actual: 35_000, variance: 95_000 },
      { planItemId: "p-alloc", planned: 700_000, actual: 0, variance: 700_000 },
      { planItemId: "p-emergency", planned: 500_000, actual: 500_000, variance: 0 },
    ]);
  });

  it("compares planned and actual spending per envelope", () => {
    expect(result.envelopes).toEqual([
      { envelopeId: "unallocated", planned: 500_000, actual: 500_000, variance: 0 },
      { envelopeId: "meal", planned: 700_000, actual: 75_000, variance: 625_000 },
      { envelopeId: "fuel", planned: 200_000, actual: 24_951, variance: 175_049 },
      { envelopeId: "wants", planned: 130_000, actual: 50_000, variance: 80_000 },
      { envelopeId: "investment", planned: 0, actual: 0, variance: 0 },
    ]);
  });
});

describe("borrows", () => {
  it("nets unsettled rows per person and marks a zero net settled", () => {
    const rows = [
      { lender: "Me", lendee: "Budi", amount: 100_000, settled: false },
      { lender: "Budi", lendee: "Me", amount: -100_000, settled: false },
      { lender: "Me", lendee: "Sari", amount: 50_000, settled: false },
      { lender: "Sari", lendee: "Me", amount: -20_000, settled: false },
      { lender: "Me", lendee: "Andi", amount: 10_000, settled: true },
    ];
    expect(borrowBalances(rows, "Me")).toEqual([
      { person: "Budi", net: 0, settled: true },
      { person: "Sari", net: 30_000, settled: false },
    ]);
  });
});

describe("pair balances", () => {
  const pairs = pairBalances(accounts, txns);
  const sumBy = (side: 0 | 1) => {
    const out: Record<string, number> = {};
    for (const [key, value] of pairs) {
      const id = key.split("|")[side];
      out[id] = (out[id] ?? 0) + value;
    }
    return out;
  };

  it("adds up to each Fund's balance", () => {
    expect(sumBy(0)).toEqual(Object.fromEntries(balances));
  });

  it("adds up to each Budget's remaining", () => {
    const budgets = envelopeBalances(envelopes, txns, plan);
    const remaining = sumBy(1);
    for (const id of envelopes) expect(remaining[id] ?? 0).toBe(budgets.get(id)!.remaining);
  });

  it("moves money between Funds inside one Budget", () => {
    expect(pairs.get("jago|meal")).toBe(600_000 - 45_000 - 50_000);
    expect(pairs.get("cash|meal")).toBe(100_000 - 30_000 + 50_000);
  });
});
