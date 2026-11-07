import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { PlanTable } from "@/components/plan/plan-table";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { CycleStepper, pickCycle } from "@/components/shell/cycle-stepper";
import { today } from "@/lib/calendar";
import { lineTotal, planVsActual, projectedRemainder, runningBalance } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { envelopeHue } from "@/lib/hue";
import { rowToInput, TYPE_LABELS } from "@/lib/record";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Plan" };

const FREQUENCY = { once: null, weekly: "Weekly", semiweekly: "Twice a week", monthly: "Monthly", quarterly: "Quarterly" };

export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const dal = await getDal();
  const date = today();
  const [cycles, accounts, envelopes] = await Promise.all([dal.cycles(), dal.accounts(), dal.envelopes()]);
  const cycle = pickCycle(cycles, (await searchParams).cycle, date);

  if (!cycle) {
    return (
      <>
        <Band>
          <h1 className="mt-3 text-[1.375rem] font-medium">Plan</h1>
        </Band>
        <main className="mx-auto max-w-5xl px-5 lg:px-8">
          <RecordBar placement="page" />
          <Section title="Plan items">
            <Empty>No pay cycle yet. Start one on the Cycles screen, then plan it here.</Empty>
          </Section>
        </main>
      </>
    );
  }

  // Ordered by sort_no (plan) and by date, then created_at (transactions), as lib/finance expects.
  const [plan, txns] = await Promise.all([dal.planItems(cycle.id), dal.transactions(cycle.id)]);
  const expected = runningBalance(plan);
  const vs = planVsActual([], plan, txns).items;
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const budgets = new Map(envelopes.map((e) => [e.id, { name: e.name, hue: envelopeHue(e) }]));
  const sum = (types: string[]) => plan.filter((p) => types.includes(p.type)).reduce((s, p) => s + lineTotal(p), 0);
  // Record from the plan on today's date when it falls in this cycle, otherwise on the plan date or the start.
  const inCycle = (d: string | null) => !!d && d >= cycle.startDate && d <= cycle.endDate;

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Plan</h1>
        <CycleStepper cycles={cycles} cycle={cycle} path="/plan" date={date} />
        <AddressWindow label="Projected remainder" className="mt-1">
          <p className="text-xs font-medium text-kraft-ink">Projected remainder</p>
          <Money
            value={projectedRemainder(plan)}
            className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]"
          />
          <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <dt className="text-kraft-ink">Planned income</dt>
              <dd>
                <Money value={sum(["income"])} />
              </dd>
            </div>
            <div>
              <dt className="text-kraft-ink">Planned spending</dt>
              <dd>
                <Money value={sum(["expense", "saving"])} />
              </dd>
            </div>
          </dl>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Section title="Plan items">
          <PlanTable
            cycle={{
              id: cycle.id,
              startDate: cycle.startDate,
              endDate: cycle.endDate,
              closed: cycle.status === "closed",
              hasPrevious: cycles.some((c) => c.startDate < cycle.startDate),
            }}
            recordDate={inCycle(date) ? date : cycle.startDate}
            rows={plan.map((p, i) => {
              const spends = p.type === "expense" || p.type === "saving";
              const budgetId = p.type === "income" ? p.destEnvelopeId : p.sourceEnvelopeId;
              const funds =
                p.type === "income"
                  ? `into ${names.get(p.destAccountId)}`
                  : p.type === "transfer"
                    ? `${names.get(p.sourceAccountId)} to ${names.get(p.destAccountId)}`
                    : `from ${names.get(p.sourceAccountId)}`;
              return {
                input: { ...rowToInput(p), frequency: p.frequency, sortNo: p.sortNo },
                meta: [`${TYPE_LABELS[p.type]} ${funds}`, FREQUENCY[p.frequency], p.date && formatDate(p.date)]
                  .filter(Boolean)
                  .join(" · "),
                budget: budgets.get(budgetId ?? "") ?? null,
                planned: vs[i].planned,
                actual: vs[i].actual,
                variance: vs[i].variance,
                expected: expected[i],
                spends,
              };
            })}
          />
        </Section>
      </main>
    </>
  );
}
