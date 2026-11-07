import type { Metadata } from "next";
import { RecentList } from "@/components/overview/recent-list";
import { RecordBar } from "@/components/overview/record-bar";
import { NeedsWants } from "@/components/overview/needs-wants";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, HueDot, Money, Section } from "@/components/shell/bits";
import { daysBetween, today } from "@/lib/calendar";
import {
  accountBalances,
  cycleDays,
  envelopeBalances,
  needsVsWants,
  projectedRemainder,
  totalFunds,
  usableFunds,
} from "@/lib/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { envelopeHue } from "@/lib/hue";
import { rowToInput } from "@/lib/record";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

function daysLeft(end: string, date: string) {
  const left = daysBetween(date, end);
  if (left < 0) return `ended ${formatDate(end)}`;
  if (left === 0) return "last day";
  return `${left} ${left === 1 ? "day" : "days"} left`;
}

export default async function OverviewPage() {
  const dal = await getDal();
  const date = today();
  const [cycles, accounts, envelopes, subcategories, recent] = await Promise.all([
    dal.cycles(),
    dal.accounts(),
    dal.envelopes(),
    dal.subcategories(),
    dal.recentTransactions(10),
  ]);
  // The cycle holding today, or the latest one when today is past it.
  const cycle = cycles.find((c) => c.startDate <= date && c.endDate >= date) ?? cycles[0];
  const [txns, plan] = cycle ? await Promise.all([dal.transactions(cycle.id), dal.planItems(cycle.id)]) : [[], []];

  const balances = accountBalances(accounts, txns);
  const usable = usableFunds(accounts, balances);
  const total = totalFunds(balances);
  const own = accounts.filter((a) => a.kind !== "external" && !a.archived);
  const usableNames = own.filter((a) => a.countsAsUsable).map((a) => a.name);
  const budgets = envelopeBalances(
    envelopes.map((e) => e.id),
    txns,
    plan,
  );
  const active = envelopes.filter((e) => {
    const b = budgets.get(e.id)!;
    return b.planned || b.allocated || b.spent || b.movedOut;
  });
  const split = cycle ? needsVsWants(txns, subcategories, cycleDays(cycle)) : [];
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const hues = new Map(envelopes.map((e) => [e.id, envelopeHue(e)]));

  return (
    <>
      <Band>
        <h1 className="sr-only">Overview</h1>
        <p className="mt-3 text-[0.8125rem] text-kraft-ink">
          {cycle ? `${cycle.name} · ${daysLeft(cycle.endDate, date)}` : "No pay cycle yet"}
        </p>
        <AddressWindow label="Funds at a glance" className="mt-2">
          <p className="text-[0.8125rem] font-medium text-kraft-ink">
            Usable funds{usableNames.length > 0 && ` · ${usableNames.join(", ")}`}
          </p>
          <Money value={usable} className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]" />
          <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <dt className="text-kraft-ink">Total funds</dt>
              <dd>
                <Money value={total} />
              </dd>
            </div>
            <div>
              <dt className="text-kraft-ink">Projected remainder</dt>
              <dd>{plan.length ? <Money value={projectedRemainder(plan)} /> : <span className="text-kraft-ink">No plan yet</span>}</dd>
            </div>
          </dl>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />

        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <Section title="Funds">
              {own.length === 0 ? (
                <Empty>No Funds yet. Run the seed command from the README to create the starting set.</Empty>
              ) : (
                <ul className="rounded-panel bg-panel">
                  {own.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 border-t border-divider px-4 py-3 text-[0.9375rem] first:border-t-0">
                      <span className="min-w-0">
                        {a.name}
                        {(a.minBalance > 0 || !a.countsAsUsable) && (
                          <span className="mt-px block text-xs text-muted-foreground">
                            {a.minBalance > 0 ? `Keeps ${formatMoney(a.minBalance)} minimum` : "Not in usable funds"}
                          </span>
                        )}
                      </span>
                      <Money value={balances.get(a.id) ?? 0} />
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Budgets">
              {active.length === 0 ? (
                <Empty>
                  Nothing in a Budget yet. Record income, then use a Transfer to move it from Unallocated into a Budget.
                </Empty>
              ) : (
                <ul className="rounded-panel bg-panel">
                  {active.map((e) => {
                    const b = budgets.get(e.id)!;
                    const used = b.overBudget ? 1 : Math.min(b.used ?? 0, 1);
                    return (
                      <li key={e.id} className="border-t border-divider px-4 py-3 first:border-t-0">
                        <div className="flex items-center justify-between gap-4 text-[0.9375rem]">
                          <span className="flex min-w-0 items-center gap-2">
                            <HueDot hue={envelopeHue(e)} />
                            <span className="truncate">{e.name}</span>
                          </span>
                          {b.overBudget ? (
                            <span>
                              <Money value={b.remaining} /> <span className="text-sm text-destructive">over</span>
                            </span>
                          ) : (
                            <span>
                              <Money value={b.remaining} /> <span className="text-sm text-muted-foreground">left</span>
                            </span>
                          )}
                        </div>
                        <div
                          role="img"
                          aria-label={`${formatMoney(b.spent)} spent of ${formatMoney(b.allocated)}`}
                          className="mt-2 h-2 overflow-hidden rounded-full bg-track"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${used * 100}%`, background: b.overBudget ? "var(--destructive-soft)" : envelopeHue(e) }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>

          <div>
            <Section title="Needs vs Wants">
              <NeedsWants split={split} />
            </Section>

            <Section title="Recent">
              {recent.length === 0 ? (
                <Empty>Nothing recorded yet. Your latest records show up here.</Empty>
              ) : (
                <RecentList
                  rows={recent.map((t) => ({
                    input: { ...rowToInput(t), date: t.date },
                    total: t.total ?? 0,
                    hue: hues.get((t.type === "income" ? t.destEnvelopeId : t.sourceEnvelopeId) ?? "") ?? "var(--track)",
                    meta: [
                      formatDate(t.date),
                      t.type === "income"
                        ? `Income to ${names.get(t.destAccountId)}`
                        : t.type === "transfer"
                          ? `${names.get(t.sourceAccountId)} to ${names.get(t.destAccountId)}`
                          : `${t.type === "saving" ? "Saving from " : ""}${names.get(t.sourceAccountId)}`,
                    ].join(" · "),
                  }))}
                />
              )}
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
