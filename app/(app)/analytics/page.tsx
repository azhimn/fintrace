import type { Metadata } from "next";
import Form from "next/form";
import { CategoryBars, DailyLine } from "@/components/analytics/charts";
import { Uncategorised } from "@/components/analytics/uncategorised";
import { RecordBar } from "@/components/overview/record-bar";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { CycleStepper, pickCycle } from "@/components/shell/cycle-stepper";
import { today } from "@/lib/calendar";
import { cycleDays, dailySpending, lineTotal, needsVsWants, subcategoryAnalysis } from "@/lib/finance";
import { formatDate, formatMoney, formatPercent, formatQuantity } from "@/lib/format";
import { rowToInput } from "@/lib/record";
import { getDal } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const GROUPS = [
  { key: "needs", label: "Needs", hue: "var(--secondary)" },
  { key: "wants", label: "Wants", hue: "var(--wants)" },
  { key: null, label: "Unclassified", hue: "var(--unclassified)" },
] as const;

const field = "h-11 min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--secondary)]";

export default async function AnalyticsPage({ searchParams }: PageProps<"/analytics">) {
  const dal = await getDal();
  const date = today();
  const params = await searchParams;
  const [cycles, accounts, categories, subcategories, tags] = await Promise.all([
    dal.cycles(),
    dal.accounts(),
    dal.categories(),
    dal.subcategories(),
    dal.tags(),
  ]);
  const cycle = pickCycle(cycles, params.cycle, date);
  const previous = cycle && cycles[cycles.indexOf(cycle) + 1];
  const [txns, prevTxns] = await Promise.all([
    cycle ? dal.transactions(cycle.id) : [],
    previous ? dal.transactions(previous.id) : [],
  ]);
  const tag = typeof params.tag === "string" && tags.includes(params.tag) ? params.tag : undefined;

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const subName = new Map(subcategories.map((s) => [s.id, s.name]));
  const nameOf = (id: string | null) => (id ? (categoryName.get(id) ?? "Archived category") : "Uncategorised");
  const byTotal = <T extends { total: number }>(a: T, b: T) => b.total - a.total;

  const split = cycle ? needsVsWants(txns, subcategories, cycleDays(cycle)) : [];
  const expenses = subcategoryAnalysis(txns, subcategories);
  const tagged = tag ? subcategoryAnalysis(txns, subcategories, tag) : expenses;
  const before = new Map(subcategoryAnalysis(prevTxns, subcategories).map((c) => [c.categoryId, c.total]));
  const spent = expenses.reduce((s, c) => s + c.total, 0);
  const spentBefore = [...before.values()].reduce((s, t) => s + t, 0);
  const saved = txns.filter((t) => !t.isOpening && t.type === "saving").reduce((s, t) => s + lineTotal(t), 0);

  const daily = cycle ? dailySpending(txns, cycle) : [];
  const prevDaily = previous ? dailySpending(prevTxns, previous) : [];
  // Days still ahead have no value yet, so the line stops at today instead of reading as zero spending.
  const days = daily.map((d, i) => ({ day: i + 1, date: d.date, total: d.date > date ? undefined : d.total, previous: prevDaily[i]?.total }));

  const comparison = [...new Set([...expenses.map((c) => c.categoryId), ...before.keys()])]
    .map((id) => ({ id, now: expenses.find((c) => c.categoryId === id)?.total ?? 0, then: before.get(id) ?? 0 }))
    .sort((a, b) => b.now - a.now || b.then - a.then);

  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const loose = txns.filter((t) => !t.isOpening && (t.type === "expense" || t.type === "saving") && !t.subcategoryId);
  const editable = cycle?.status === "open";

  const change = (now: number, then: number) => {
    if (!then) return <span className="text-muted-foreground">{now ? "New" : "–"}</span>;
    const ratio = (now - then) / then;
    return (
      <span className={cn("figure", ratio > 0 ? "text-foreground" : "text-muted-foreground")}>
        {ratio > 0 ? "+" : ""}
        {formatPercent(ratio)}
      </span>
    );
  };

  const badge = (count: number) => (
    <span className="ml-2 rounded-full bg-track px-2.5 py-0.5 text-xs text-muted-foreground">{count} to sort</span>
  );
  const categorise = editable && loose.length > 0 && (
    <a href="#uncategorised" className="ml-1 rounded-sm text-sm text-primary underline-offset-4 hover:underline">
      Categorise
    </a>
  );

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Analytics</h1>
        {cycle && <CycleStepper cycles={cycles} cycle={cycle} path="/analytics" date={date} />}
        {cycle && (
          <AddressWindow label="Spending this cycle" className="mt-2">
            <p className="text-[0.8125rem] font-medium text-kraft-ink">Spent this cycle</p>
            <Money value={spent} className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]" />
            <dl className="mt-2 grid grid-cols-3 gap-3 text-[0.8125rem]">
              <div>
                <dt className="text-kraft-ink">Per week</dt>
                <dd>
                  <Money value={Math.round(spent / (cycleDays(cycle) / 7))} />
                </dd>
              </div>
              <div>
                <dt className="text-kraft-ink">Saved</dt>
                <dd>
                  <Money value={saved} />
                </dd>
              </div>
              <div>
                <dt className="text-kraft-ink">Last cycle</dt>
                <dd>{previous ? <Money value={spentBefore} /> : <span className="text-kraft-ink">None yet</span>}</dd>
              </div>
            </dl>
          </AddressWindow>
        )}
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        {!cycle ? (
          <Section title="Analytics">
            <Empty>No pay cycle yet. Start one on the Cycles screen, and your spending shows up here as you record.</Empty>
          </Section>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
              <Section title="Spending by category">
                {expenses.length ? (
                  <div className="rounded-panel bg-panel px-2 py-3">
                    <CategoryBars rows={[...expenses].sort(byTotal).map((c) => ({ name: nameOf(c.categoryId), total: c.total }))} />
                  </div>
                ) : (
                  <Empty>No expenses recorded this cycle yet.</Empty>
                )}
              </Section>
              <Section title="Daily spending">
                <div className="rounded-panel bg-panel px-4 py-3">
                  <DailyLine days={days} previousName={previous ? previous.name : null} />
                </div>
              </Section>
            </div>

            <Section title="Needs vs Wants by category">
              <p className="-mt-1 mb-2 px-1 text-sm text-muted-foreground">Expenses and savings together. Savings have no Needs or Wants, so they sit under Unclassified.</p>
              {split.length === 0 ? (
                <Empty>No spending or saving recorded this cycle yet.</Empty>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-x-8">
                  {GROUPS.map((g) => {
                    const group = split.find((s) => s.classification === g.key);
                    if (!group) return null;
                    const rows = [...group.categories].sort((a, b) => b.spent - a.spent);
                    const stats = (r: typeof group.total) =>
                      `${r.times} ${r.times === 1 ? "time" : "times"}, ${formatQuantity(r.avgTimesPerWeek.toFixed(1))} a week · avg ${formatMoney(Math.round(r.avgPerSpend))} each · ${formatMoney(Math.round(r.spentPerWeek))} spent a week`;
                    return (
                      <div key={g.label} className="rounded-panel bg-panel">
                        <h3 className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 text-[0.9375rem] font-medium">
                          <span className="flex items-center gap-2">
                            <span aria-hidden className="size-2.5 rounded-full" style={{ background: g.hue }} />
                            {g.label}
                          </span>
                          <Money value={group.total.spent} />
                        </h3>
                        <p className="px-4 pb-2 text-xs text-muted-foreground">{stats(group.total)}</p>
                        <ul>
                          {rows.map((r) => (
                            <li key={r.categoryId ?? "none"} className="border-t border-divider px-4 py-2.5">
                              <span className="flex items-center justify-between gap-3 text-[0.9375rem]">
                                <span className="flex min-w-0 flex-wrap items-center">
                                  {nameOf(r.categoryId)}
                                  {r.categoryId === null && badge(r.times)}
                                  {r.categoryId === null && categorise}
                                </span>
                                <Money value={r.spent} />
                              </span>
                              <span className="mt-px block text-xs text-muted-foreground">{stats(r)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
              <Section
                title="Expenses by subcategory"
              >
                {tags.length > 0 && (
                  <Form action="/analytics" className="mb-2 flex items-center gap-2">
                    <input type="hidden" name="cycle" value={cycle.id} />
                    <label>
                      <span className="sr-only">Tag</span>
                      <select name="tag" defaultValue={tag ?? ""} className={cn(field, "max-w-48 bg-panel")}>
                        <option value="">All tags</option>
                        {tags.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="h-11 rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground">
                      Apply
                    </button>
                  </Form>
                )}
                {tagged.length === 0 ? (
                  <Empty>{tag ? `No expenses tagged “${tag}” this cycle.` : "No expenses recorded this cycle yet."}</Empty>
                ) : (
                  <ul className="rounded-panel bg-panel">
                    {[...tagged].sort(byTotal).map((c) => (
                      <li key={c.categoryId ?? "none"} className="border-t border-divider px-4 py-3 first:border-t-0">
                        <span className="flex items-center justify-between gap-3 text-[0.9375rem] font-medium">
                          <span className="flex min-w-0 flex-wrap items-center">
                            {nameOf(c.categoryId)}
                            {c.categoryId === null && categorise}
                          </span>
                          <span className="shrink-0">
                            <Money value={c.total} />
                            <span className="font-normal text-muted-foreground"> · {c.count}×</span>
                          </span>
                        </span>
                        {c.categoryId !== null && (
                          <ul className="mt-1.5">
                            {[...c.subcategories].sort(byTotal).map((s) => (
                              <li key={s.subcategoryId ?? "none"} className="flex items-center justify-between gap-3 py-1 text-sm text-muted-foreground">
                                <span className="min-w-0 truncate">{s.subcategoryId ? subName.get(s.subcategoryId) : "No subcategory"}</span>
                                <span className="shrink-0">
                                  <span className="figure text-foreground">{formatMoney(s.total)}</span> · {s.count}×
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title={previous ? `Compared with ${previous.name}` : "Compared with last cycle"}>
                {!previous ? (
                  <Empty>This is your first cycle. The comparison starts once a second one exists.</Empty>
                ) : comparison.length === 0 ? (
                  <Empty>No expenses in either cycle yet.</Empty>
                ) : (
                  <div className="overflow-x-auto rounded-panel bg-panel">
                    <table className="w-full text-left text-[0.9375rem]">
                      <thead className="text-[0.8125rem] text-muted-foreground">
                        <tr>
                          <th scope="col" className="py-2.5 pl-4 font-medium">Category</th>
                          <th scope="col" className="px-3 py-2.5 text-right font-medium">This cycle</th>
                          <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Last cycle</th>
                          <th scope="col" className="py-2.5 pr-4 pl-3 text-right font-medium">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.map((r) => (
                          <tr key={r.id ?? "none"} className="border-t border-divider">
                            <td className="py-2.5 pl-4">{nameOf(r.id)}</td>
                            <td className="px-3 py-2.5 text-right">
                              <Money value={r.now} className={cn(!r.now && "text-muted-foreground")} />
                            </td>
                            <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                              <Money value={r.then} className={cn(!r.then && "text-muted-foreground")} />
                            </td>
                            <td className="py-2.5 pr-4 pl-3 text-right">{change(r.now, r.then)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-divider font-medium">
                          <td className="py-2.5 pl-4">Total</td>
                          <td className="px-3 py-2.5 text-right">
                            <Money value={spent} />
                          </td>
                          <td className="hidden px-3 py-2.5 text-right sm:table-cell">
                            <Money value={spentBefore} />
                          </td>
                          <td className="py-2.5 pr-4 pl-3 text-right">{change(spent, spentBefore)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>
            </div>

            {loose.length > 0 && (
              <section id="uncategorised" className="scroll-mt-4">
                <Section title={`Uncategorised · ${loose.length}`}>
                  <Uncategorised
                    editable={editable}
                    rows={loose.map((t) => ({
                      input: { ...rowToInput(t), date: t.date },
                      total: lineTotal(t),
                      meta: [formatDate(t.date), names.get(t.sourceAccountId), t.type === "saving" ? "Saving" : null]
                        .filter(Boolean)
                        .join(" · "),
                    }))}
                  />
                  {!editable && (
                    <p className="mt-2 px-1 text-sm text-muted-foreground">This cycle is closed, so these stay as they are.</p>
                  )}
                </Section>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
