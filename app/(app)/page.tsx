import type { Metadata } from "next";
import { RecentList } from "@/components/overview/recent-list";
import { RecordBar } from "@/components/overview/record-bar";
import { NeedsWants } from "@/components/overview/needs-wants";
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
import { getDal } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

function daysLeft(end: string, date: string) {
  const left = daysBetween(date, end);
  if (left < 0) return `ended ${formatDate(end)}`;
  if (left === 0) return "last day";
  return `${left} ${left === 1 ? "day" : "days"} left`;
}

const Money = ({ value, className }: { value: number; className?: string }) => (
  <span className={cn("figure", value < 0 && "text-destructive", className)}>{formatMoney(value)}</span>
);

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
      <header className="bg-kraft">
        <div className="mx-auto max-w-5xl px-5 pt-5 pb-5 lg:px-8 lg:pt-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-base font-semibold">
              fintrace<span className="sr-only"> overview</span>
            </h1>
            <p className="text-[0.8125rem] text-kraft-ink lg:mr-auto lg:ml-6">
              {cycle ? `${cycle.name} · ${daysLeft(cycle.endDate, date)}` : "No pay cycle yet"}
            </p>
            <RecordBar placement="band" />
          </div>

          <section aria-label="Funds at a glance" className="mt-4 rounded-panel bg-window px-4 pt-3.5 pb-4 lg:max-w-md">
            <p className="text-xs font-medium text-kraft-ink">
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
          </section>
        </div>
      </header>
      <div className="flap" aria-hidden />

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
                            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: envelopeHue(e) }} />
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
                    input: {
                      id: t.id,
                      item: t.item,
                      type: t.type,
                      sourceAccountId: t.sourceAccountId,
                      destAccountId: t.destAccountId,
                      amount: t.amount,
                      date: t.date,
                      quantity: t.quantity,
                      discount: t.discount,
                      sourceEnvelopeId: t.sourceEnvelopeId,
                      destEnvelopeId: t.destEnvelopeId,
                      subcategoryId: t.subcategoryId,
                      classification: t.classification,
                      location: t.location,
                      unit: t.unit,
                      note: t.note,
                      tags: t.tags,
                      planItemId: t.planItemId,
                    },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[22px]">
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-panel bg-panel px-4 py-4 text-[0.9375rem] text-muted-foreground">{children}</p>;
}
