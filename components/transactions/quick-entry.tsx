"use client";

import { useId, useRef, useState } from "react";
import { deleteRecord, saveRecord } from "@/app/(app)/actions";
import { ItemCombobox } from "@/components/record/item-combobox";
import { blank, fromInput, toInput, useFunds, withType, type State } from "@/components/record/record-form";
import { useRecord } from "@/components/record/record-provider";
import { toasts } from "@/components/record/toast";
import { Button } from "@/components/ui/button";
import { formatAmountInput, formatMoney } from "@/lib/format";
import { lineTotal } from "@/lib/finance";
import { fieldErrors, recordInput, TYPE_LABELS, TYPES, type RecordType, type Suggestion } from "@/lib/record";
import { matchesShortcut } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

const cell = "h-11 w-full min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--primary)] aria-invalid:shadow-[0_0_0_2px_var(--destructive)]";

/**
 * The spreadsheet-style row on top of the Transactions table: the five required fields and Save.
 * More (and anything the row can't settle, like a date outside every cycle) hands the entry to the
 * Quick Record sheet, the same form phones use.
 */
export function QuickEntry() {
  const { data, open } = useRecord();
  const funds = useFunds(data);
  const [state, setState] = useState<State>(() => blank(funds));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const itemRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const own = funds.sources;

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  function pick(s: Suggestion) {
    setState((prev) => {
      const next = { ...prev, ...fromInput(s.fill), planItemId: s.fill.planItemId ?? null };
      return s.fill.sourceAccountId ? next : withType(next, next.type, funds);
    });
    setErrors({});
  }

  const more = () => open({ initial: toInput(state) });

  async function submit() {
    if (busy) return;
    const input = toInput(state);
    const parsed = recordInput.safeParse(input);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      if (!Number.isFinite(input.amount)) fields.amount = state.amount.trim() ? "Use 18.000, 50rb or 1,5jt" : "Enter an amount";
      setErrors(fields);
      return;
    }
    setBusy(true);
    try {
      const result = await saveRecord(input);
      if (!result.ok) {
        // The sheet knows how to start a cycle; send the entry there.
        if ("needsCycle" in result) return more();
        setErrors({ ...result.fields, form: result.error });
        return;
      }
      const id = toasts.add({
        title: "Saved",
        description: `${input.item} · ${formatMoney(lineTotal(input))}`,
        timeout: 6000,
        actionProps: {
          children: "Undo",
          async onClick() {
            toasts.close(id);
            const removed = await deleteRecord(input.id);
            toasts.add({ title: removed ? `Removed ${input.item}` : "Couldn't undo that", timeout: 3000 });
          },
        },
      });
      setState((s) => blank(funds, { type: s.type, sourceAccountId: s.sourceAccountId, destAccountId: s.destAccountId, date: s.date }));
      setErrors({});
      requestAnimationFrame(() => itemRef.current?.focus());
    } catch {
      setErrors({ form: "You're offline. Use Record to keep it on this device." });
    } finally {
      setBusy(false);
    }
  }

  const fundSelect = (side: "source" | "dest") => {
    const key = side === "source" ? "sourceAccountId" : "destAccountId";
    const external = side === "source" ? state.type === "income" : state.type === "expense" || state.type === "saving";
    return (
      <select
        id={fid(side)}
        aria-label={side === "source" ? "From Fund" : "To Fund"}
        value={state[key]}
        disabled={external}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={!!errors[key] || undefined}
        className={cn(cell, "disabled:bg-field/60 disabled:text-muted-foreground")}
      >
        {external ? (
          <option value={state[key]}>External</option>
        ) : (
          own.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))
        )}
      </select>
    );
  };

  const message = errors.form || Object.values(errors).find(Boolean);

  return (
    <form
      noValidate
      aria-label="Quick entry"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (matchesShortcut(e.nativeEvent, data.shortcuts.saveAndAddAnother)) {
          e.preventDefault();
          submit();
        }
      }}
      className="hidden rounded-panel bg-panel p-2 lg:block"
    >
      <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] items-center gap-2">
        <ItemCombobox
          id={fid("item")}
          compact
          inputRef={itemRef}
          value={state.item}
          onChange={(v) => {
            set("item", v);
            if (state.planItemId) set("planItemId", null);
          }}
          onPick={pick}
          invalid={!!errors.item}
        />
        <select
          aria-label="Type"
          value={state.type}
          onChange={(e) => {
            setState((s) => withType({ ...s, subcategoryId: "", classification: "" }, e.target.value as RecordType, funds));
            setErrors({});
          }}
          className={cell}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {fundSelect("source")}
        {fundSelect("dest")}
        <input
          aria-label="Amount"
          value={state.amount}
          onChange={(e) => set("amount", formatAmountInput(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Amount"
          aria-invalid={!!errors.amount || undefined}
          className={cn(cell, "figure text-right")}
        />
        <Button type="button" variant="ghost" onClick={more} className="h-11 px-3 text-[0.9375rem] text-muted-foreground">
          More
        </Button>
        <Button type="submit" disabled={busy} className="h-11 px-4 text-[0.9375rem]">
          Save
        </Button>
      </div>
      {message && (
        <p role="alert" className="px-2 pt-2 pb-1 text-sm text-destructive">
          {message}
        </p>
      )}
    </form>
  );
}
