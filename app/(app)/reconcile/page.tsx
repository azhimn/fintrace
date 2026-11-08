import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { CountRow } from "@/components/reconcile/count-row";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { CycleStepper, pickCycle } from "@/components/shell/cycle-stepper";
import { today } from "@/lib/calendar";
import { accountBalances, reconcile } from "@/lib/finance";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Reconcile" };

export default async function ReconcilePage({ searchParams }: PageProps<"/reconcile">) {
  const dal = await getDal();
  const date = today();
  const [cycles, accounts] = await Promise.all([dal.cycles(), dal.accounts()]);
  const cycle = pickCycle(cycles, (await searchParams).cycle, date);
  const [txns, counts] = cycle ? await Promise.all([dal.transactions(cycle.id), dal.reconciliations(cycle.id)]) : [[], []];

  const balances = accountBalances(accounts, txns);
  const result = reconcile(accounts, balances, counts);
  const own = accounts.filter((a) => a.kind !== "external" && !a.archived);
  const external = accounts.find((a) => a.kind === "external")?.id ?? "";
  const open = cycle?.status === "open";
  // Adjustments land on today, or the nearest day inside the cycle when today is outside it.
  const adjustOn = cycle ? (date < cycle.startDate ? cycle.startDate : date > cycle.endDate ? cycle.endDate : date) : date;
  const off = result.rows.filter((r) => r.difference !== 0).length;

  const rows = (list: typeof own) => (
    <ul className="rounded-panel bg-panel">
      {list.map((a) => {
        const latest = result.rows.find((r) => r.accountId === a.id);
        return (
          <CountRow
            key={a.id}
            cycleId={cycle!.id}
            account={{ id: a.id, name: a.name, kind: a.kind, countsAsUsable: a.countsAsUsable, minBalance: a.minBalance }}
            computed={balances.get(a.id) ?? 0}
            difference={latest?.difference ?? null}
            history={counts
              .filter((c) => c.accountId === a.id)
              .map((c) => ({ id: c.id, counted: c.countedBalance, countedAt: c.countedAt, note: c.note }))}
            open={open}
            external={external}
            adjustOn={adjustOn}
          />
        );
      })}
    </ul>
  );
  const usable = own.filter((a) => a.countsAsUsable);
  const others = own.filter((a) => !a.countsAsUsable);

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Reconcile</h1>
        {cycle && <CycleStepper cycles={cycles} cycle={cycle} path="/reconcile" date={date} />}
        {cycle && (
          <AddressWindow label="Difference from what you counted" className="mt-2">
            <p className="text-[0.8125rem] font-medium text-kraft-ink">
              {result.rows.length ? "Counted minus recorded, all Funds" : "Nothing counted this cycle yet"}
            </p>
            <Money value={result.total} signed className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]" />
            <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
              <div>
                <dt className="text-kraft-ink">Usable Funds only</dt>
                <dd>
                  <Money value={result.usable} signed />
                </dd>
              </div>
              <div>
                <dt className="text-kraft-ink">Counted</dt>
                <dd>
                  {result.rows.length} of {own.length} Funds{off > 0 && ` · ${off} off`}
                </dd>
              </div>
            </dl>
          </AddressWindow>
        )}
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        {!cycle ? (
          <Section title="Funds">
            <Empty>No pay cycle yet. Start one on the Cycles screen, then count your Funds here.</Empty>
          </Section>
        ) : (
          <>
            <div className="grid gap-x-8 lg:grid-cols-2">
              <Section title="Usable Funds">{usable.length ? rows(usable) : <Empty>No Fund counts as usable. Change that in Settings.</Empty>}</Section>
              {others.length > 0 && <Section title="Other Funds">{rows(others)}</Section>}
            </div>
            {!open && <p className="mt-2 px-1 text-sm text-muted-foreground">This cycle is closed, so its counts are final.</p>}
          </>
        )}
      </main>
    </>
  );
}
