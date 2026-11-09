"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon, CaretDownIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { addBorrow, deleteBorrow, settleBorrows } from "@/app/(app)/actions";
import { DateField } from "@/components/record/record-form";
import { fieldClass, labelClass, RowMenu, SlidingPill, useAction } from "@/components/shell/action";
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
        <div className="relative grid grid-cols-2 gap-1 rounded-button bg-background p-1">
          <SlidingPill count={2} index={form.direction === "out" ? 0 : 1} />
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
              <span className="flex min-h-11 cursor-pointer flex-col justify-center rounded-field px-3 py-1.5 text-[0.9375rem] text-muted-foreground transition-colors duration-300 peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
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
      <Button type="submit" size="lg" disabled={pending} className="col-span-2">
        <CheckCircleIcon weight="fill" aria-hidden className="size-5" />
        Save
      </Button>
      <p className="col-span-2 text-xs text-muted-foreground">
        This only keeps the tally. If money left or reached a Fund, record that too, so its balance stays right.
      </p>
    </form>
  );
}

const phrase = (net: number) => (net > 0 ? "owes you" : net < 0 ? "you owe" : "even");

/** How many of a person's rows show when their group opens; the rest wait behind Show more. */
const RECENT = 5;

/**
 * One person's open rows and their net, as an accordion that starts closed. Opening shows the
 * newest rows first (they arrive newest first). Mark settled appears once the net is zero.
 */
export function PersonGroup({ person, net, rows }: { person: string; net: number; rows: BorrowRow[] }) {
  const { run, pending, alert } = useAction();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const id = useId();
  const shown = all ? rows : rows.slice(0, RECENT);
  return (
    <li className="border-t border-divider first:border-t-0">
      <div className="flex items-center gap-2 pr-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="-mr-4 flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-panel py-2 pr-4 pl-4 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-medium">{person}</span>
            <span className="block text-xs text-muted-foreground">
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {net !== 0 && (
              <span className="text-right">
                <span className="figure">{formatMoney(Math.abs(net))}</span>
                <span className={cn("block text-xs", net < 0 ? "text-destructive" : "text-muted-foreground")}>{phrase(net)}</span>
              </span>
            )}
            <CaretDownIcon
              weight="fill"
              aria-hidden
              className={cn("size-4 text-quiet-control transition-transform duration-300", open && "rotate-180")}
            />
          </span>
        </button>
        {net === 0 && (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => settleBorrows(person), `Settled with ${person}`)} className="h-11 px-4 text-[0.9375rem]">
            Mark settled
          </Button>
        )}
      </div>
      {/* Always rendered so it can grow and shrink; inert while closed so nothing in it takes focus. */}
      <div
        id={id}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {net === 0 && <p className="px-4 text-xs text-muted-foreground">You&apos;re even. Settling moves these rows to history.</p>}
          <ul className="pb-1">
            {shown.map((r) => (
              <BorrowLine key={r.id} row={r} />
            ))}
          </ul>
          {rows.length > RECENT && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="mb-2 ml-2 h-11 rounded-button px-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {all ? "Show fewer" : `Show ${rows.length - RECENT} more`}
            </button>
          )}
        </div>
      </div>
      {alert && <div className="px-4 pb-3">{alert}</div>}
    </li>
  );
}

export function BorrowLine({ row, muted }: { row: BorrowRow; muted?: boolean }) {
  const { run } = useAction();
  const out = row.amount > 0;
  return (
    <li className="flex items-center justify-between gap-2 py-0.5 pr-1 pl-4">
      <span className="flex min-w-0 items-center gap-3 py-1.5">
        {/* Direction at a glance: apricot ↗ when money left you, mint ↙ when it came back. */}
        <span
          aria-hidden
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-foreground",
            out ? "bg-(--hue-apricot)" : "bg-(--hue-mint)",
            muted && "opacity-50",
          )}
        >
          {out ? <ArrowUpRightIcon weight="fill" className="size-4" /> : <ArrowDownLeftIcon weight="fill" className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className={cn("block truncate text-[0.9375rem]", muted && "text-muted-foreground")}>{row.item}</span>
          <span className="mt-px block truncate text-xs text-muted-foreground">
            {[formatDate(row.date), out ? "Money out" : "Money in", row.fund].filter(Boolean).join(" · ")}
          </span>
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
