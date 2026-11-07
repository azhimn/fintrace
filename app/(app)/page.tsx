import type { Metadata } from "next";
import { DayNumeral } from "@/components/day-numeral";
import { monthSheet } from "@/lib/calendar";
import { formatMoney } from "@/lib/format";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

const KINDS = { bank: "Bank", e_wallet: "E-wallet", cash: "Cash", external: "External" };

export default async function OverviewPage() {
  const dal = await getDal();
  const [accounts, envelopes] = await Promise.all([dal.accounts(), dal.envelopes()]);
  const ownAccounts = accounts.filter((a) => a.kind !== "external" && !a.archived);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl font-semibold">Overview</h1>
          <DayNumeral sheet={monthSheet()} className="shrink-0" />
        </div>
        <p className="max-w-prose text-muted-foreground">
          No pay cycle yet. Balances and budgets appear here once a cycle is open.
        </p>
      </div>

      <section aria-labelledby="accounts-heading" className="flex flex-col gap-3">
        <h2 id="accounts-heading" className="text-lg font-semibold">
          Accounts
        </h2>
        {ownAccounts.length === 0 ? (
          <p className="text-muted-foreground">
            No accounts yet. Run the seed command from the README to create the starting set.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-foreground text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Account
                </th>
                <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">
                  Kind
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Minimum balance
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Usable
                </th>
              </tr>
            </thead>
            <tbody>
              {ownAccounts.map((account) => (
                <tr key={account.id} className="border-b border-border">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {account.name}
                  </th>
                  <td className="hidden py-3 pr-4 text-muted-foreground sm:table-cell">{KINDS[account.kind]}</td>
                  <td className="numeral py-3 pr-4 text-right text-base whitespace-nowrap">{formatMoney(account.minBalance)}</td>
                  <td className="py-3 text-right">{account.countsAsUsable ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="envelopes-heading" className="flex flex-col gap-3">
        <h2 id="envelopes-heading" className="text-lg font-semibold">
          Envelopes
        </h2>
        {envelopes.length === 0 ? (
          <p className="text-muted-foreground">
            No envelopes yet. Run the seed command from the README to create the starting set.
          </p>
        ) : (
          <ul className="grid grid-cols-2 border-y border-t-foreground border-b-border text-sm sm:grid-cols-3 lg:grid-cols-4">
            {envelopes.map((envelope) => (
              <li key={envelope.id} className="-mb-px border-b border-border py-3 pr-4">
                {envelope.name}
                {envelope.isSystem && <span className="block text-xs text-muted-foreground">Default for new money</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
