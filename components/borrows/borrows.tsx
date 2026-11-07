"use client";

import { useId, useState } from "react";
import { addBorrow, deleteBorrow, settleBorrows } from "@/app/(app)/actions";
import { DateField } from "@/components/record/record-form";
import { fieldClass, labelClass, RowMenu, useAction } from "@/components/shell/action";
import { Button } from "@/components/ui/button";
import { today } from "@/lib/calendar";
import { formatAmountInput, formatDate, formatMoney, parseAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };
export type BorrowRow = { id: string; item: string; amount: number; date: string; fund: string | null };

const DIRECTIONS = [
  { value: "out", label: "Money out", hint: "Lent, or paid back" },
  { value: "in", label: "Money in", hint: "Borrowed, or got paid back" },
] as const;

/** Adds a borrow row. Positive when money went out to the person, negative when it came in. */
export function BorrowForm({ people, funds, budgets }: { people: string[]; funds: Option[]; budgets: Option[] }) {
  const blank = { person: "", direction: "out" as "out" | "in", item: "", amount: "", date: today(), fund: "", budget: "" };
  const [form, setForm] = useState(blank);
  const { run, pending, alert, setError } = useAction();
  const uid = useId();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseAmount(form.amount);
    if (!amount) return setError("Enter an amount like 50rb or 1,5jt");
    run(
      () =>
        addBorrow({
          person: form.person,
          direction: form.direction,
          item: form.item,
          amount,
          date: form.date,
          sourceAccountId: form.fund || null,
          envelopeId: form.budget || null,
        }),
      `Saved for ${form.person.trim()}`,
      () => setForm({ ...blank, date: form.date }),
    );
  }

  return (
    <form noValidate onSubmit={submit} className="grid grid-cols-2 gap-x-3 gap-y-4 rounded-panel bg-panel p-4">
      <fieldset className="col-span-2">
        <legend className="mb-2 text-[0.8125rem] font-medium text-muted-foreground">Which way</legend>
        <div className="grid grid-cols-2 gap-1 rounded-button bg-background p-1">
          {DIRECTIONS.map((d) => (
            <label key={d.value} className="relative">
              <input
                type="radio"
                name={`${uid}-direction`}
                value={d.value}
                checked={form.direction === d.value}
                onChange={() => set("direction", d.value)}
                className="peer sr-only"
              />
              <span className="flex min-h-11 cursor-pointer flex-col justify-center rounded-field px-3 py-1.5 text-[0.9375rem] text-muted-foreground peer-checked:bg-secondary peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                <span className="font-medium">{d.label}</span>
                <span className="text-xs">{d.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className={labelClass}>
        Person
        <input
          value={form.person}
          onChange={(e) => set("person", e.target.value)}
          list={`${uid}-people`}
          autoComplete="off"
          placeholder="Who"
          className={fieldClass}
        />
        <datalist id={`${uid}-people`}>
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label className={labelClass}>
        Amount
        <input
          value={form.amount}
          onChange={(e) => set("amount", formatAmountInput(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Rp 0"
          className={cn(fieldClass, "figure")}
        />
      </label>
      <label className={cn(labelClass, "col-span-2")}>
        What for
        <input value={form.item} onChange={(e) => set("item", e.target.value)} autoComplete="off" placeholder="Dinner, rent share" className={fieldClass} />
      </label>
      <div className={cn(labelClass, "col-span-2 sm:col-span-1")}>
        <label htmlFor={`${uid}-date`}>Date</label>
        <DateField id={`${uid}-date`} value={form.date} onChange={(v) => set("date", v)} />
      </div>
      <label className={labelClass}>
        Fund, for reference
        <select value={form.fund} onChange={(e) => set("fund", e.target.value)} className={fieldClass}>
          <option value="">None</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Budget, for reference
        <select value={form.budget} onChange={(e) => set("budget", e.target.value)} className={fieldClass}>
          <option value="">None</option>
          {budgets.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {alert && <div className="col-span-2">{alert}</div>}
      <Button type="submit" size="lg" disabled={pending} className="col-span-2 text-[0.9375rem]">
        Save
      </Button>
      <p className="col-span-2 text-xs text-muted-foreground">
        This only keeps the tally. If money left or reached a Fund, record that too, so its balance stays right.
      </p>
    </form>
  );
}

const phrase = (net: number) => (net > 0 ? "owes you" : net < 0 ? "you owe" : "even");

/** One person's open rows and their net, with Mark settled once the net is zero. */
export function PersonGroup({ person, net, rows }: { person: string; net: number; rows: BorrowRow[] }) {
  const { run, pending, alert } = useAction();
  return (
    <li className="border-t border-divider first:border-t-0">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1">
        <span className="min-w-0 truncate text-[0.9375rem] font-medium">{person}</span>
        <span className="flex items-center gap-2 text-right">
          {net === 0 ? (
            <Button variant="secondary" disabled={pending} onClick={() => run(() => settleBorrows(person), `Settled with ${person}`)} className="h-11 px-4 text-[0.9375rem]">
              Mark settled
            </Button>
          ) : (
            <span>
              <span className="figure">{formatMoney(Math.abs(net))}</span>
              <span className={cn("block text-xs", net < 0 ? "text-destructive" : "text-muted-foreground")}>{phrase(net)}</span>
            </span>
          )}
        </span>
      </div>
      {net === 0 && <p className="px-4 text-xs text-muted-foreground">You&apos;re even. Settling moves these rows to history.</p>}
      <ul className="pb-1">
        {rows.map((r) => (
          <BorrowLine key={r.id} row={r} />
        ))}
      </ul>
      {alert && <div className="px-4 pb-3">{alert}</div>}
    </li>
  );
}

export function BorrowLine({ row, muted }: { row: BorrowRow; muted?: boolean }) {
  const { run } = useAction();
  return (
    <li className="flex items-center justify-between gap-2 py-0.5 pr-1 pl-4">
      <span className="min-w-0 py-1.5">
        <span className={cn("block truncate text-[0.9375rem]", muted && "text-muted-foreground")}>{row.item}</span>
        <span className="mt-px block truncate text-xs text-muted-foreground">
          {[formatDate(row.date), row.amount > 0 ? "Money out" : "Money in", row.fund].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="flex shrink-0 items-center">
        {/* Unsigned: the direction is in the line above, and red would read as a debt. */}
        <span className={cn("figure text-[0.9375rem]", muted && "text-muted-foreground")}>{formatMoney(Math.abs(row.amount))}</span>
        <RowMenu
          label={`Actions for ${row.item}`}
          actions={[{ label: "Delete", destructive: true, onClick: () => run(() => deleteBorrow(row.id), `Deleted ${row.item}`) }]}
        />
      </span>
    </li>
  );
}
