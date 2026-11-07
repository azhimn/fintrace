import { ArrowsLeftRightIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { AllocateButton, AllocateProvider } from "@/components/budgets/allocate";
import { RecordBar } from "@/components/overview/record-bar";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, HueDot, Money, Section } from "@/components/shell/bits";
import { CycleStepper, pickCycle } from "@/components/shell/cycle-stepper";
import { today } from "@/lib/calendar";
import { envelopeBalances, pairBalances, type EnvelopeBalance } from "@/lib/finance";
import { formatMoney, formatPercent } from "@/lib/format";
import { envelopeHue } from "@/lib/hue";
import { getDal } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Budgets" };

const quiet = "rounded-button text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground";

export default async function BudgetsPage({ searchParams }: PageProps<"/budgets">) {
  const dal = await getDal();
  const date = today();
  const [cycles, accounts, envelopes] = await Promise.all([dal.cycles(), dal.accounts(), dal.envelopes()]);
  const cycle = pickCycle(cycles, (await searchParams).cycle, date);
  const [txns, plan] = cycle ? await Promise.all([dal.transactions(cycle.id), dal.planItems(cycle.id)]) : [[], []];

  const balances = envelopeBalances(
    envelopes.map((e) => e.id),
    txns,
    plan,
  );
  const unallocated = envelopes.find((e) => e.isSystem);
  const rest = envelopes.filter((e) => !e.isSystem);
  const total = (key: keyof Pick<EnvelopeBalance, "planned" | "allocated" | "spent">) =>
    rest.reduce((s, e) => s + balances.get(e.id)![key], 0);
  const open = cycle?.status === "open" && cycle.startDate <= date && cycle.endDate >= date;

  const table = (
    <>
      <ul className="overflow-hidden rounded-panel bg-panel lg:hidden">
        {envelopes.map((e) => {
          const b = balances.get(e.id)!;
          const fill = b.overBudget ? 1 : Math.min(b.used ?? 0, 1);
          if (!b.planned && !b.allocated && !b.spent && !b.movedOut) {
            return (
              <li key={e.id} className="border-t border-divider first:border-t-0">
                <AllocateButton
                  to={e.isSystem ? undefined : e.id}
                  disabled={!open}
                  className="flex min-h-11 w-full items-center justify-between gap-4 rounded-panel px-4 py-2.5 text-left text-[0.9375rem] disabled:cursor-default"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <HueDot hue={envelopeHue(e)} />
                    <span className="truncate">{e.name}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{open && !e.isSystem ? "Empty · Allocate" : "Empty"}</span>
                </AllocateButton>
              </li>
            );
          }
          return (
            <li key={e.id} className="border-t border-divider first:border-t-0">
              <AllocateButton
                to={e.isSystem ? undefined : e.id}
                disabled={!open}
                className="block w-full rounded-panel px-4 py-3 text-left disabled:cursor-default"
              >
                <span className="flex items-center justify-between gap-4 text-[0.9375rem]">
                  <span className="flex min-w-0 items-center gap-2">
                    <HueDot hue={envelopeHue(e)} />
                    <span className="truncate">{e.name}</span>
                  </span>
                  <span>
                    <Money value={b.remaining} />{" "}
                    <span className={cn("text-sm", b.overBudget ? "text-destructive" : "text-muted-foreground")}>
                      {b.overBudget ? "over" : "left"}
                    </span>
                  </span>
                </span>
                <span
                  role="img"
                  aria-label={`${formatMoney(b.spent)} spent of ${formatMoney(b.allocated)}`}
                  className="mt-2 block h-2 overflow-hidden rounded-full bg-track"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${fill * 100}%`, background: b.overBudget ? "var(--destructive-soft)" : envelopeHue(e) }}
                  />
                </span>
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {[
                    b.planned ? `Planned ${formatMoney(b.planned)}` : null,
                    `In ${formatMoney(b.allocated)}`,
                    `Spent ${formatMoney(b.spent)}`,
                    b.used !== null ? formatPercent(b.used) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </AllocateButton>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto rounded-panel bg-panel lg:block">
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="text-[0.8125rem] text-muted-foreground">
            <tr>
              <th scope="col" className="py-2.5 pl-4 font-medium">Budget</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Planned</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Allocated</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Spent</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Remaining</th>
              <th scope="col" className="w-40 px-3 py-2.5 font-medium">Used</th>
              {open && <th scope="col" className="w-28"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {envelopes.map((e) => {
              const b = balances.get(e.id)!;
              const fill = b.overBudget ? 1 : Math.min(b.used ?? 0, 1);
              if (!b.planned && !b.allocated && !b.spent && !b.movedOut) {
                return (
                  <tr key={e.id} className="border-t border-divider">
                    <td className="py-1.5 pl-4">
                      <span className="flex items-center gap-2">
                        <HueDot hue={envelopeHue(e)} />
                        {e.name}
                      </span>
                    </td>
                    <td colSpan={5} className="px-3 py-1.5 text-sm text-muted-foreground">
                      Empty
                    </td>
                    {open && (
                      <td className="pr-2 text-right">
                        {!e.isSystem && (
                          <AllocateButton to={e.id} className={cn(quiet, "h-11 px-3")}>
                            Allocate
                          </AllocateButton>
                        )}
                      </td>
                    )}
                  </tr>
                );
              }
              return (
                <tr key={e.id} className="border-t border-divider">
                  <td className="py-2.5 pl-4">
                    <span className="flex items-center gap-2">
                      <HueDot hue={envelopeHue(e)} />
                      {e.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={b.planned} className={cn(!b.planned && "text-muted-foreground")} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={b.allocated} className={cn(!b.allocated && "text-muted-foreground")} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={b.spent} className={cn(!b.spent && "text-muted-foreground")} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <Money value={b.remaining} className={cn(!b.remaining && "text-muted-foreground")} />
                    {b.overBudget && <span className="ml-1.5 text-sm text-destructive">over</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="block h-2 flex-1 overflow-hidden rounded-full bg-track">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${fill * 100}%`, background: b.overBudget ? "var(--destructive-soft)" : envelopeHue(e) }}
                        />
                      </span>
                      <span className={cn("figure w-14 text-right text-xs", b.overBudget ? "text-destructive" : "text-muted-foreground")}>
                        {b.used === null ? "–" : formatPercent(b.used)}
                      </span>
                    </span>
                  </td>
                  {open && (
                    <td className="pr-2 text-right">
                      {!e.isSystem && (
                        <AllocateButton to={e.id} className={cn(quiet, "h-11 px-3")}>
                          Allocate
                        </AllocateButton>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  const pairs = Object.fromEntries(pairBalances(accounts, txns));
  return (
    <AllocateProvider
      budgets={envelopes.map((e) => ({ id: e.id, name: e.name, isSystem: e.isSystem }))}
      funds={accounts.filter((a) => a.kind !== "external" && !a.archived)}
      pairs={pairs}
      date={date}
    >
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Budgets</h1>
        {cycle && <CycleStepper cycles={cycles} cycle={cycle} path="/budgets" date={date} />}
        {cycle && unallocated && (
          <AddressWindow label="Not yet in a Budget" className="mt-1">
            <p className="text-[0.8125rem] font-medium text-kraft-ink">Unallocated, still in the envelope</p>
            <Money
              value={balances.get(unallocated.id)!.remaining}
              className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]"
            />
            <dl className="mt-2 grid grid-cols-3 gap-3 text-[0.8125rem]">
              <div>
                <dt className="text-kraft-ink">Planned</dt>
                <dd>
                  <Money value={total("planned")} />
                </dd>
              </div>
              <div>
                <dt className="text-kraft-ink">Allocated</dt>
                <dd>
                  <Money value={total("allocated")} />
                </dd>
              </div>
              <div>
                <dt className="text-kraft-ink">Spent</dt>
                <dd>
                  <Money value={total("spent")} />
                </dd>
              </div>
            </dl>
          </AddressWindow>
        )}
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Section
          title="Budgets"
          action={
            open && (
              <AllocateButton className="-mb-1 flex h-11 items-center gap-2 rounded-button bg-primary px-4 text-[0.9375rem] font-medium text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_10%)]">
                <ArrowsLeftRightIcon weight="fill" aria-hidden className="size-4" />
                Allocate
              </AllocateButton>
            )
          }
        >
          {cycle ? table : <Empty>No pay cycle yet. Start one on the Cycles screen, then fill your Budgets here.</Empty>}
          {cycle && !open && (
            <p className="mt-2 px-1 text-sm text-muted-foreground">
              {cycle.status === "closed" ? "This cycle is closed, so its Budgets are final." : "Allocating works in the cycle that holds today."}
            </p>
          )}
        </Section>
      </main>
    </AllocateProvider>
  );
}
