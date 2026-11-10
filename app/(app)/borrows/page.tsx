import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { BorrowForm, BorrowLine, PersonGroup, type BorrowRow } from "@/components/borrows/borrows";
import { RecordBar } from "@/components/overview/record-bar";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { SELF } from "@/lib/dal";
import { borrowBalances } from "@/lib/finance";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Borrows" };

export default async function BorrowsPage() {
  const dal = await getDal();
  const [rows, accounts, envelopes] = await Promise.all([dal.borrows(), dal.accounts(), dal.envelopes()]);
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const personOf = (b: (typeof rows)[number]) => (b.lender === SELF ? b.lendee : b.lender);
  const line = (b: (typeof rows)[number]): BorrowRow => ({
    id: b.id,
    item: b.item,
    amount: b.amount,
    date: b.date,
    fund: b.sourceAccountId ? (names.get(b.sourceAccountId) ?? null) : null,
  });

  // Owed to you first, then what you owe, then the even ones waiting to be settled.
  const people = borrowBalances(rows, SELF).sort((a, b) => b.net - a.net || a.person.localeCompare(b.person));
  const owed = people.filter((p) => p.net > 0).reduce((s, p) => s + p.net, 0);
  const owing = people.filter((p) => p.net < 0).reduce((s, p) => s - p.net, 0);
  const settled = rows.filter((b) => b.settled);

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Borrows</h1>
        <AddressWindow label="Money between you and others">
          <p className="text-[0.8125rem] font-medium text-kraft-ink">Owed to you</p>
          <Money value={owed} className="mt-0.5 block text-[2.125rem] leading-tight font-semibold tracking-[-0.01em]" />
          <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
            <div>
              <dt className="text-kraft-ink">You owe</dt>
              <dd>
                <Money value={owing} />
              </dd>
            </div>
            <div>
              <dt className="text-kraft-ink">Open with</dt>
              <dd>
                {people.length} {people.length === 1 ? "person" : "people"}
              </dd>
            </div>
          </dl>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <Section title="People">
              {people.length === 0 ? (
                <Empty>Nothing open. When you lend or borrow money, add it here and the net per person adds up for you.</Empty>
              ) : (
                <ul className="rounded-panel bg-panel">
                  {people.map((p) => (
                    <PersonGroup
                      key={p.person}
                      person={p.person}
                      net={p.net}
                      rows={rows.filter((b) => !b.settled && personOf(b) === p.person).map(line)}
                    />
                  ))}
                </ul>
              )}
            </Section>
            {settled.length > 0 && (
              <details className="disclosure group mt-[22px]">
                <summary className="-ml-3 flex h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-button px-3 text-sm font-semibold hover:bg-accent [&::-webkit-details-marker]:hidden">
                  Settled · {settled.length}
                  <CaretDownIcon weight="fill" aria-hidden className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180" />
                </summary>
                <ul className="mt-2 rounded-panel bg-panel py-1">
                  {settled.map((b) => (
                    <BorrowLine key={b.id} row={{ ...line(b), item: `${personOf(b)} · ${b.item}` }} muted />
                  ))}
                </ul>
              </details>
            )}
          </div>
          <Section title="Add a borrow">
            <BorrowForm
              people={[...new Set(rows.map(personOf))].sort((a, b) => a.localeCompare(b))}
              funds={accounts.filter((a) => a.kind !== "external" && !a.archived)}
              budgets={envelopes}
            />
          </Section>
        </div>
      </main>
    </>
  );
}
