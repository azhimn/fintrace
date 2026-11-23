import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { AddressWindow, Band } from "@/components/shell/band";
import { Empty, Money, Section } from "@/components/shell/bits";
import { pickCycle } from "@/components/shell/cycle-stepper";
import { Filters } from "@/components/transactions/filters";
import { QuickEntry } from "@/components/transactions/quick-entry";
import { TransactionList } from "@/components/transactions/transaction-list";
import { today } from "@/lib/calendar";
import { transactionFilters } from "@/lib/dal";
import { lineTotal } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import { envelopeHue, hueVar } from "@/lib/hue";
import { iconOf } from "@/lib/icons";
import { rowToInput } from "@/lib/record";
import { getDal } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transactions" };

const PAGE = 50;

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
  // Every match, so the totals cover the whole view; the list shows one page of it.
  const found = await dal.searchTransactions({ ...filters, cycle: cycleValue });
  const pages = Math.max(1, Math.ceil(found.length / PAGE));
  const page = Math.min(filters.page ?? 1, pages);
  const rows = found.slice((page - 1) * PAGE, page * PAGE);
  const pageHref = (n: number) => {
    const params = new URLSearchParams(Object.entries(raw).flatMap(([k, v]) => (k === "page" || v === undefined ? [] : [[k, String(v)]])));
    if (n > 1) params.set("page", String(n));
    return `/transactions?${params}`;
  };

  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const fundLooks = new Map(accounts.map((a) => [a.id, { icon: iconOf(a, "wallet"), hue: hueVar(a.hue) }]));
  const budgets = new Map(envelopes.map((e) => [e.id, { name: e.name, hue: envelopeHue(e), icon: iconOf(e, "wallet") }]));
  const categoryLooks = new Map(categories.map((c) => [c.id, { icon: iconOf(c, "tag"), hue: hueVar(c.hue) }]));
  const subs = new Map(subcategories.map((s) => [s.id, { name: s.name, look: categoryLooks.get(s.categoryId) ?? null }]));
  const closed = new Set(cycles.filter((c) => c.status === "closed").map((c) => c.id));

  let spent = 0;
  let income = 0;
  for (const t of found) {
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
            Income <Money value={income} className="text-foreground" /> · {found.length} {found.length === 1 ? "record" : "records"}
          </p>
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
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
          <div className="flex flex-col gap-3">
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
                    fundLook: fundLooks.get(t.type === "income" ? t.destAccountId : t.sourceAccountId) ?? null,
                    budget:
                      t.type === "transfer" && t.sourceEnvelopeId !== t.destEnvelopeId
                        ? {
                            name: `${budgets.get(t.sourceEnvelopeId ?? "")?.name} to ${budgets.get(t.destEnvelopeId ?? "")?.name}`,
                            hue: budgets.get(t.destEnvelopeId ?? "")?.hue ?? "var(--track)",
                            icon: budgets.get(t.destEnvelopeId ?? "")?.icon ?? "wallet",
                          }
                        : (budgets.get(budgetId ?? "") ?? null),
                    category: t.isOpening ? "Carried over at close" : t.subcategoryId ? (subs.get(t.subcategoryId)?.name ?? null) : null,
                    categoryLook: t.subcategoryId ? (subs.get(t.subcategoryId)?.look ?? null) : null,
                    detail: [t.location, t.tags.length ? t.tags.join(", ") : null, t.note].filter(Boolean).join(" · "),
                  };
                })}
              />
            )}
            {pages > 1 && (
              <nav aria-label="Pages" className="flex items-center justify-between gap-3">
                <PageLink href={pageHref(page - 1)} disabled={page === 1}>
                  <CaretLeftIcon weight="fill" aria-hidden className="size-4" />
                  Newer
                </PageLink>
                <span className="text-sm text-muted-foreground">
                  {(page - 1) * PAGE + 1}–{(page - 1) * PAGE + rows.length} of {found.length}
                </span>
                <PageLink href={pageHref(page + 1)} disabled={page === pages}>
                  Older
                  <CaretRightIcon weight="fill" aria-hidden className="size-4" />
                </PageLink>
              </nav>
            )}
          </div>
        </Section>
      </main>
    </>
  );
}

/** Newer or Older: a quiet link, or a dimmed placeholder at either end. */
function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const cls = "flex h-11 items-center gap-1.5 rounded-button px-3 text-[0.9375rem]";
  return disabled ? (
    <span aria-disabled className={cn(cls, "text-muted-foreground opacity-50")}>
      {children}
    </span>
  ) : (
    <Link href={href} className={cn(cls, "hover:bg-accent")}>
      {children}
    </Link>
  );
}
