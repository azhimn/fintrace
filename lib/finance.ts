// SPEC section 4: every balance, budget and analytics formula. Pure: rows in, numbers out.
// Inputs are Drizzle row shapes, so DAL results pass straight through. Money is whole rupiah.
import type {
  accounts,
  borrows,
  cycles,
  planItems,
  reconciliations,
  subcategories,
  transactions,
} from "./db/schema";

type Row<T extends { $inferSelect: unknown }, K extends keyof T["$inferSelect"]> = Pick<T["$inferSelect"], K>;

type Line = Row<typeof transactions, "quantity" | "amount" | "discount">;
type Flow = Line &
  Row<typeof transactions, "type" | "sourceAccountId" | "destAccountId" | "sourceEnvelopeId" | "destEnvelopeId">;
export type Txn = Flow &
  Row<typeof transactions, "isOpening" | "subcategoryId" | "classification" | "tags" | "planItemId">;
export type PlanItem = Flow & Row<typeof planItems, "id">;
export type Account = Row<typeof accounts, "id" | "kind" | "minBalance" | "countsAsUsable">;
export type Subcategory = Row<typeof subcategories, "id" | "categoryId">;
export type Reconciliation = Row<typeof reconciliations, "accountId" | "countedBalance" | "countedAt">;
export type Borrow = Row<typeof borrows, "lender" | "lendee" | "amount" | "settled">;

/** round(quantity * amount - discount), rounding half away from zero like Postgres numeric. */
export function lineTotal({ quantity, amount, discount }: Line) {
  // quantity has 3 decimals, so scaling by 1000 keeps the arithmetic in exact integers.
  const milli = Math.round(Number(quantity) * 1000) * amount - discount * 1000;
  return Math.sign(milli) * Math.round(Math.abs(milli) / 1000);
}

const isSpend = (t: Flow) => t.type === "expense" || t.type === "saving";

/** Totals and row counts per key. */
export function tally<T extends Line, K>(rows: T[], key: (row: T) => K) {
  const out = new Map<K, { total: number; count: number }>();
  for (const row of rows) {
    const k = key(row);
    const entry = out.get(k) ?? { total: 0, count: 0 };
    entry.total += lineTotal(row);
    entry.count += 1;
    out.set(k, entry);
  }
  return out;
}

// Opening rows carry last cycle's balance into their destination, whatever their type.
function accountDelta(t: Txn, id: string) {
  const total = lineTotal(t);
  if (t.isOpening) return t.destAccountId === id ? total : 0;
  const into = t.destAccountId === id;
  const outOf = t.sourceAccountId === id;
  if (t.type === "income") return into ? total : 0;
  if (t.type === "transfer") return into === outOf ? 0 : into ? total : -total;
  return outOf ? -total : 0; // expense and saving; a saving's destination is ignored
}

/** Balance per non-external account. */
export function accountBalances(accts: Account[], txns: Txn[]) {
  return new Map(
    accts
      .filter((a) => a.kind !== "external")
      .map((a) => [a.id, txns.reduce((sum, t) => sum + accountDelta(t, a.id), 0)]),
  );
}

export function totalFunds(balances: Map<string, number>) {
  return [...balances.values()].reduce((sum, b) => sum + b, 0);
}

export function usableFunds(accts: Account[], balances: Map<string, number>) {
  return accts
    .filter((a) => a.countsAsUsable && balances.has(a.id))
    .reduce((sum, a) => sum + balances.get(a.id)! - a.minBalance, 0);
}

/**
 * Balance after each row, in the order given: income (and opening rows) add, expense and saving
 * subtract, transfers change nothing. Callers order transactions by date then created_at, and
 * plan items by sort_no, which gives the plan's Expected Funds.
 */
export function runningBalance(rows: (Flow & { isOpening?: boolean })[]) {
  let balance = 0;
  return rows.map((t) => {
    if (t.isOpening || t.type === "income") balance += lineTotal(t);
    else if (isSpend(t)) balance -= lineTotal(t);
    return balance;
  });
}

/** The plan's last Expected Funds value. */
export const projectedRemainder = (plan: PlanItem[]) => runningBalance(plan).at(-1) ?? 0;

export type EnvelopeBalance = {
  planned: number;
  allocated: number;
  spent: number;
  movedOut: number;
  remaining: number;
  /** spent / allocated, null when nothing was allocated. */
  used: number | null;
  overBudget: boolean;
};

/**
 * Per envelope id. Rows with a null envelope are not counted: the write path fills in
 * Unallocated (SPEC section 3).
 */
export function envelopeBalances(envelopeIds: string[], txns: Txn[], plan: PlanItem[]) {
  // A transfer within one envelope (between accounts) neither adds nor moves money out.
  const crosses = (t: Flow) => t.sourceEnvelopeId !== t.destEnvelopeId;
  return new Map(
    envelopeIds.map((id): [string, EnvelopeBalance] => {
      const sum = (rows: Flow[]) => rows.reduce((s, t) => s + lineTotal(t), 0);
      const planned = sum(plan.filter((p) => isSpend(p) && p.sourceEnvelopeId === id));
      const allocated = sum(
        txns.filter(
          (t) =>
            t.destEnvelopeId === id &&
            (t.isOpening || t.type === "income" || (t.type === "transfer" && crosses(t))),
        ),
      );
      const spent = sum(txns.filter((t) => !t.isOpening && isSpend(t) && t.sourceEnvelopeId === id));
      const movedOut = sum(
        txns.filter((t) => !t.isOpening && t.type === "transfer" && t.sourceEnvelopeId === id && crosses(t)),
      );
      const remaining = allocated - spent - movedOut;
      return [
        id,
        { planned, allocated, spent, movedOut, remaining, used: allocated ? spent / allocated : null, overBudget: remaining < 0 },
      ];
    }),
  );
}

/**
 * counted − computed per counted account (latest count wins), in total, and over usable accounts.
 * `balances` are the computed balances to compare against.
 */
export function reconcile(accts: Account[], balances: Map<string, number>, counts: Reconciliation[]) {
  const latest = new Map<string, Reconciliation>();
  for (const c of counts) {
    const seen = latest.get(c.accountId);
    if (!seen || c.countedAt > seen.countedAt) latest.set(c.accountId, c);
  }
  const usable = new Set(accts.filter((a) => a.countsAsUsable).map((a) => a.id));
  const rows = [...latest.values()].map((c) => {
    const computed = balances.get(c.accountId) ?? 0;
    return { accountId: c.accountId, counted: c.countedBalance, computed, difference: c.countedBalance - computed };
  });
  const sum = (rs: typeof rows) => rs.reduce((s, r) => s + r.difference, 0);
  return { rows, total: sum(rows), usable: sum(rows.filter((r) => usable.has(r.accountId))) };
}

/** Days in a cycle, both ends included. */
export function cycleDays({ startDate, endDate }: Row<typeof cycles, "startDate" | "endDate">) {
  return (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
}

function rates({ total: spent, count: times }: { total: number; count: number }, weeks: number) {
  return {
    spent,
    times,
    avgTimesPerWeek: times / weeks,
    avgPerSpend: times ? spent / times : 0,
    spentPerWeek: spent / weeks,
  };
}

const categoryOf = (subs: Subcategory[]) => {
  const map = new Map(subs.map((s) => [s.id, s.categoryId]));
  return (t: Txn) => (t.subcategoryId ? (map.get(t.subcategoryId) ?? null) : null);
};

/**
 * Expense and saving rows by classification, then category. A null categoryId is Uncategorised;
 * a null classification groups rows left unclassified (saving subcategories have no default).
 */
export function needsVsWants(txns: Txn[], subs: Subcategory[], days: number) {
  const weeks = days / 7;
  const category = categoryOf(subs);
  const spend = txns.filter((t) => !t.isOpening && isSpend(t));
  return [...tally(spend, (t) => t.classification)].map(([classification, totals]) => ({
    classification,
    categories: [...tally(spend.filter((t) => t.classification === classification), category)].map(
      ([categoryId, c]) => ({ categoryId, ...rates(c, weeks) }),
    ),
    total: rates(totals, weeks),
  }));
}

/** Expense totals and counts per category, drilled down per subcategory, optionally for one tag. */
export function subcategoryAnalysis(txns: Txn[], subs: Subcategory[], tag?: string) {
  const category = categoryOf(subs);
  const rows = txns.filter((t) => !t.isOpening && t.type === "expense" && (!tag || t.tags.includes(tag)));
  return [...tally(rows, category)].map(([categoryId, c]) => ({
    categoryId,
    ...c,
    subcategories: [...tally(rows.filter((t) => category(t) === categoryId), (t) => t.subcategoryId)].map(
      ([subcategoryId, s]) => ({ subcategoryId, ...s }),
    ),
  }));
}

/** variance = planned − actual, so a positive variance is money not yet used. */
export function planVsActual(envelopeIds: string[], plan: PlanItem[], txns: Txn[]) {
  const linked = tally(
    txns.filter((t) => !t.isOpening && t.planItemId),
    (t) => t.planItemId,
  );
  const envelopes = envelopeBalances(envelopeIds, txns, plan);
  return {
    items: plan.map((p) => {
      const planned = lineTotal(p);
      const actual = linked.get(p.id)?.total ?? 0;
      return { planItemId: p.id, planned, actual, variance: planned - actual };
    }),
    envelopes: envelopeIds.map((id) => {
      const { planned, spent: actual } = envelopes.get(id)!;
      return { envelopeId: id, planned, actual, variance: planned - actual };
    }),
  };
}

/**
 * Net per person over unsettled rows; the person is whichever of lender and lendee is not `self`.
 * settled is true once the net reaches 0, when the rows can be marked settled.
 */
export function borrowBalances(rows: Borrow[], self: string) {
  const net = new Map<string, number>();
  for (const b of rows.filter((r) => !r.settled)) {
    const person = b.lender === self ? b.lendee : b.lender;
    net.set(person, (net.get(person) ?? 0) + b.amount);
  }
  return [...net].map(([person, amount]) => ({ person, net: amount, settled: amount === 0 }));
}

/**
 * Balance per Fund and Budget pair, keyed `account|envelope`, using the same rules as
 * accountBalances. Summed over a Fund it gives that Fund's balance; over a Budget, its remaining.
 * Close cycle carries each non-zero pair into the next cycle as an opening row.
 */
export function pairBalances(accts: Account[], txns: Txn[]) {
  const own = new Set(accts.filter((a) => a.kind !== "external").map((a) => a.id));
  const out = new Map<string, number>();
  const add = (account: string, envelope: string | null, amount: number) => {
    if (!own.has(account)) return;
    const key = `${account}|${envelope ?? ""}`;
    out.set(key, (out.get(key) ?? 0) + amount);
  };
  for (const t of txns) {
    const total = lineTotal(t);
    if (t.isOpening || t.type === "income") add(t.destAccountId, t.destEnvelopeId, total);
    else if (isSpend(t)) add(t.sourceAccountId, t.sourceEnvelopeId, -total);
    else {
      add(t.sourceAccountId, t.sourceEnvelopeId, -total);
      add(t.destAccountId, t.destEnvelopeId, total);
    }
  }
  return out;
}
