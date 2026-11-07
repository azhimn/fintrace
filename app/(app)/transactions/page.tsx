import type { Metadata } from "next";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { RecordBar } from "@/components/overview/record-bar";
import { pickCycle } from "@/components/shell/cycle-stepper";
import { Filters } from "@/components/transactions/filters";
import { QuickEntry } from "@/components/transactions/quick-entry";
import { TransactionList } from "@/components/transactions/transaction-list";
import { today } from "@/lib/calendar";
import { transactionFilters } from "@/lib/dal";
import { lineTotal } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { envelopeHue } from "@/lib/hue";
import { rowToInput } from "@/lib/record";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Transactions" };

// shortcut: shows the newest 300 matches with no paging, add paging if a cycle ever holds more.
const LIMIT = 300;

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const raw = await searchParams;
  const filters = transactionFilters.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) || undefined])),
  );
  const dal = await getDal();
  const date = today();
  const [cycles, accounts, envelopes, categories, subcategories, tags] = await Promise.all([
    dal.cycles(),
    dal.accounts(),
    dal.envelopes(),
    dal.categories(),
    dal.subcategories(),
    dal.tags(),
  ]);
  // No cycle in the URL means the current one; "all" is a choice of its own.
  const cycleValue = filters.cycle ?? pickCycle(cycles, undefined, date)?.id ?? "all";
  const found = await dal.searchTransactions({ ...filters, cycle: cycleValue }, LIMIT);
  const rows = found.slice(0, LIMIT);

  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const budgets = new Map(envelopes.map((e) => [e.id, { name: e.name, hue: envelopeHue(e) }]));
  const subs = new Map(subcategories.map((s) => [s.id, s.name]));
  const closed = new Set(cycles.filter((c) => c.status === "closed").map((c) => c.id));

  let spent = 0;
  let income = 0;
  for (const t of rows) {
    if (t.isOpening) continue;
    if (t.type === "income") income += lineTotal(t);
    else if (t.type !== "transfer") spent += lineTotal(t);
  }

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Transactions</h1>
        <AddressWindow label="This view in numbers" className="mt-2">
          <p className="text-[0.8125rem] font-medium text-kraft-ink">Spent and saved in this view</p>
          <Money value={spent} className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]" />
          <p className="mt-2 text-[0.8125rem] text-kraft-ink">
            Income <Money value={income} className="text-foreground" /> · {rows.length}
            {found.length > LIMIT ? "+" : ""} {rows.length === 1 ? "record" : "records"}
          </p>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Section title="Filters">
          <Filters
            values={filters}
            cycleValue={cycleValue}
            cycles={cycles}
            funds={accounts.filter((a) => a.kind !== "external")}
            budgets={envelopes}
            categories={categories.map((c) => ({ ...c, subs: subcategories.filter((s) => s.categoryId === c.id) }))}
            tags={tags}
          />
        </Section>

        <Section title="Records">
          <div className="flex flex-col gap-2">
            <QuickEntry />
            {rows.length === 0 ? (
              <Empty>
                {cycles.length === 0
                  ? "No records yet. Record your first payment and fintrace starts a pay cycle for it."
                  : "Nothing matches these filters. Clear some, or pick All cycles."}
              </Empty>
            ) : (
              <TransactionList
                rows={rows.map((t) => {
                  const budgetId = t.type === "income" ? t.destEnvelopeId : t.sourceEnvelopeId;
                  return {
                    input: { ...rowToInput(t), date: t.date },
                    isOpening: t.isOpening,
                    closed: closed.has(t.cycleId),
                    total: t.total ?? lineTotal(t),
                    date: formatDate(t.date),
                    funds:
                      t.type === "income"
                        ? `Into ${names.get(t.destAccountId)}`
                        : t.type === "transfer"
                          ? t.sourceAccountId === t.destAccountId
                            ? `Within ${names.get(t.sourceAccountId)}`
                            : `${names.get(t.sourceAccountId)} to ${names.get(t.destAccountId)}`
                          : `From ${names.get(t.sourceAccountId)}`,
                    budget:
                      t.type === "transfer" && t.sourceEnvelopeId !== t.destEnvelopeId
                        ? {
                            name: `${budgets.get(t.sourceEnvelopeId ?? "")?.name} to ${budgets.get(t.destEnvelopeId ?? "")?.name}`,
                            hue: budgets.get(t.destEnvelopeId ?? "")?.hue ?? "var(--track)",
                          }
                        : (budgets.get(budgetId ?? "") ?? null),
                    category: t.isOpening ? "Carried over at close" : t.subcategoryId ? (subs.get(t.subcategoryId) ?? null) : null,
                    detail: [t.location, t.tags.length ? t.tags.join(", ") : null, t.note].filter(Boolean).join(" · "),
                  };
                })}
              />
            )}
            {found.length > LIMIT && (
              <p className="px-1 text-sm text-muted-foreground">Showing the newest {LIMIT}. Narrow the filters to see older ones.</p>
            )}
          </div>
        </Section>
      </main>
    </>
  );
}
