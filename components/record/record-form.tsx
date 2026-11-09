"use client";

import { CaretDownIcon, CheckCircleIcon, PlayIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { deletePlanItem, deleteRecord, savePlanItem, saveRecord, startCycleAndSave, type SaveResult } from "@/app/(app)/actions";
import { SlidingPill } from "@/components/shell/action";
import { ScrollThumb } from "@/components/shell/scroll-thumb";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { today } from "@/lib/calendar";
import { lineTotal } from "@/lib/finance";
import { formatAmountInput, formatDate, formatMoney, formatQuantity, parseAmount } from "@/lib/format";
import { dequeue, enqueue } from "@/lib/offline-queue";
import { fieldErrors, recordInput, TYPE_LABELS, TYPES, type RecordInput, type RecordType, type Suggestion } from "@/lib/record";
import type { RecordData } from "@/lib/record-data";
import { matchesShortcut } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { ItemCombobox, suggestionHint, useSuggestions } from "./item-combobox";
import { toasts } from "./toast";

export type Mode = "add" | "edit";

export type State = {
  id: string;
  item: string;
  type: RecordType;
  amount: string;
  sourceAccountId: string;
  destAccountId: string;
  date: string;
  quantity: string;
  discount: string;
  sourceEnvelopeId: string;
  destEnvelopeId: string;
  subcategoryId: string;
  classification: "" | "needs" | "wants";
  location: string;
  unit: string;
  note: string;
  tags: string;
  planItemId: string | null;
  frequency: Frequency;
};

export const FREQUENCIES = ["once", "weekly", "semiweekly", "monthly", "quarterly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
/** A plan item as the form takes it: a record plus frequency, with an optional date. */
export type PlanInput = Omit<Partial<RecordInput>, "date"> & { date?: string | null; frequency?: Frequency; sortNo?: number };

const CATEGORY_KIND = { expense: "expense", income: "income", saving: "saving", transfer: null } as const;

const money = (n: number | null | undefined) => (n == null ? "" : formatAmountInput(String(n)));

/** The Fund lists, most used first (sort is stable, so ties keep the Settings order). */
export function useFunds(data: RecordData) {
  const own = data.accounts.filter((a) => a.kind !== "external");
  return {
    external: data.accounts.find((a) => a.kind === "external")?.id ?? "",
    sources: [...own].sort((a, b) => b.sourceUses - a.sourceUses),
    dests: [...own].sort((a, b) => b.destUses - a.destUses),
  };
}
export type Funds = ReturnType<typeof useFunds>;

/** Puts External on the side section 3 says it belongs to, keeping the user's own picks where they fit. */
export function withType(s: State, type: RecordType, funds: Funds): State {
  const ownId = (id: string) => (id && id !== funds.external ? id : "");
  const source = ownId(s.sourceAccountId) || ownId(s.destAccountId) || funds.sources[0]?.id || "";
  const dest = ownId(s.destAccountId) || ownId(s.sourceAccountId) || funds.dests[0]?.id || "";
  if (type === "income") return { ...s, type, sourceAccountId: funds.external, destAccountId: dest };
  if (type === "transfer") {
    const to = dest !== source ? dest : (funds.dests.find((a) => a.id !== source)?.id ?? dest);
    return { ...s, type, sourceAccountId: source, destAccountId: to };
  }
  return { ...s, type, sourceAccountId: source, destAccountId: funds.external };
}

export function fromInput(d: PlanInput): Partial<State> {
  const out: Partial<State> = {};
  const set = <K extends keyof State>(k: K, v: State[K] | undefined) => v !== undefined && (out[k] = v);
  set("id", d.id);
  set("item", d.item);
  set("type", d.type);
  set("sourceAccountId", d.sourceAccountId);
  set("destAccountId", d.destAccountId);
  if (d.date !== undefined) out.date = d.date ?? "";
  set("frequency", d.frequency);
  if (d.amount !== undefined) out.amount = money(d.amount);
  if (d.quantity !== undefined) out.quantity = formatQuantity(d.quantity);
  if (d.discount !== undefined) out.discount = d.discount ? money(d.discount) : "";
  if (d.sourceEnvelopeId !== undefined) out.sourceEnvelopeId = d.sourceEnvelopeId ?? "";
  if (d.destEnvelopeId !== undefined) out.destEnvelopeId = d.destEnvelopeId ?? "";
  if (d.subcategoryId !== undefined) out.subcategoryId = d.subcategoryId ?? "";
  if (d.classification !== undefined) out.classification = d.classification ?? "";
  if (d.location !== undefined) out.location = d.location ?? "";
  if (d.unit !== undefined) out.unit = d.unit ?? "";
  if (d.note !== undefined) out.note = d.note ?? "";
  if (d.tags !== undefined) out.tags = d.tags.join(", ");
  if (d.planItemId !== undefined) out.planItemId = d.planItemId ?? null;
  return out;
}

export function blank(funds: Funds, keep?: Pick<State, "type" | "sourceAccountId" | "destAccountId" | "date">): State {
  const s: State = {
    id: crypto.randomUUID(),
    item: "",
    type: "expense",
    amount: "",
    sourceAccountId: "",
    destAccountId: "",
    date: today(),
    quantity: "1",
    discount: "",
    sourceEnvelopeId: "",
    destEnvelopeId: "",
    subcategoryId: "",
    classification: "",
    location: "",
    unit: "",
    note: "",
    tags: "",
    planItemId: null,
    frequency: "once",
    ...keep,
  };
  return withType(s, s.type, funds);
}

/** Form state to what the server takes. Amount text that isn't an id-ID amount becomes NaN and fails. */
export function toInput(s: State) {
  const discount = s.discount.trim() ? parseAmount(s.discount) : 0;
  const input = {
    id: s.id,
    item: s.item,
    type: s.type,
    sourceAccountId: s.sourceAccountId,
    destAccountId: s.destAccountId,
    amount: parseAmount(s.amount) ?? Number.NaN,
    date: s.date,
    quantity: s.quantity.trim().replace(",", ".") || "1",
    discount: discount ?? Number.NaN,
    sourceEnvelopeId: s.sourceEnvelopeId || null,
    destEnvelopeId: s.destEnvelopeId || null,
    subcategoryId: s.subcategoryId || null,
    classification: s.classification || null,
    location: s.location,
    unit: s.unit,
    note: s.note,
    tags: s.tags.split(",").map((t) => t.trim()).filter(Boolean),
    planItemId: s.planItemId,
  } satisfies RecordInput;
  return input;
}

type Props = {
  data: RecordData;
  initial?: PlanInput;
  /** Edit the plan of this cycle instead of recording a transaction. */
  plan?: { cycleId: string; cycleStart: string };
  mode?: Mode;
  /** The record was saved and the user is done. */
  onDone: () => void;
  onClose: () => void;
  /** Escape is handled by the sheet itself; the page variant handles it here. */
  handleEscape?: boolean;
  /** Opens with the optional fields showing, to categorise a record. */
  more?: boolean;
  title: React.ReactNode;
};

export function RecordForm({ data, initial, plan, mode = "add", onDone, onClose, handleEscape, more: openMore, title }: Props) {
  const funds = useFunds(data);
  const [state, setState] = useState<State>(() => {
    const base = plan ? { ...blank(funds), date: "" } : blank(funds);
    if (!initial) return base;
    const merged = { ...base, ...fromInput(initial) };
    return initial.sourceAccountId ? merged : withType(merged, merged.type, funds);
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [more, setMore] = useState(!!openMore);
  const [busy, setBusy] = useState(false);
  const [cycle, setCycle] = useState<{ date: string; start: string; again: boolean } | null>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const picks = useSuggestions();
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;

  useEffect(() => {
    if (mode !== "add") return;
    picks.load("");
    itemRef.current?.focus();
    // Once per form: the empty-field picks and the first focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  function pick(s: Suggestion) {
    setState((prev) => {
      const next = { ...prev, ...fromInput(s.fill), planItemId: s.fill.planItemId ?? null };
      return s.fill.sourceAccountId ? next : withType(next, next.type, funds);
    });
    setErrors({});
    // On a phone, drop the keyboard so Save is in reach; on a desktop, go on to the amount.
    if (window.matchMedia("(pointer: coarse)").matches) (document.activeElement as HTMLElement | null)?.blur();
    else requestAnimationFrame(() => amountRef.current?.select());
  }

  const subcategory = data.categories.flatMap((c) => c.subs).find((s) => s.id === state.subcategoryId);
  const kind = CATEGORY_KIND[state.type];
  const categories = kind ? data.categories.filter((c) => c.kind === kind) : [];
  const amount = parseAmount(state.amount);
  const input = toInput(state);
  const total = Number.isFinite(input.amount) && Number.isFinite(input.discount) && /^\d+(\.\d{1,3})?$/.test(input.quantity)
    ? lineTotal({ amount: input.amount, quantity: input.quantity, discount: input.discount })
    : null;
  const showTotal = total !== null && (input.quantity !== "1" || input.discount > 0);
  const started = mode === "edit" || state.item.trim() !== "" || !!initial;

  /** Reverses the save. False when it couldn't. */
  async function undo(saved: RecordInput, offline: boolean) {
    if (offline) {
      dequeue(saved.id);
      return true;
    }
    if (mode === "add") return plan ? !!(await deletePlanItem(saved.id)) : deleteRecord(saved.id);
    // Put the row back as it was before this edit.
    const result = plan ? await savePlanItem(plan.cycleId, initial, "edit") : await saveRecord(initial, "edit");
    return result.ok;
  }

  function finish(saved: RecordInput, again: boolean, offline: boolean) {
    const description = `${saved.item} · ${formatMoney(lineTotal(saved as Parameters<typeof lineTotal>[0]))}`;
    const id = toasts.add({
      title: offline ? "Saved on this device" : mode === "edit" ? "Changes saved" : plan ? "Added to the plan" : "Saved",
      description: offline ? `${description}. It syncs when you're back online.` : description,
      timeout: 6000,
      actionProps: {
        children: "Undo",
        async onClick() {
          toasts.close(id);
          const undone = await undo(saved, offline);
          toasts.add({
            title: !undone ? "Couldn't undo that" : mode === "edit" ? `Changes to ${saved.item} undone` : `Removed ${saved.item}`,
            timeout: 3000,
          });
        },
      },
    });
    setCycle(null);
    if (!again && !offline) return onDone();
    // Offline there is nothing to refresh or navigate to: close if we can, and clear the form so a
    // second tap can't queue the same entry twice.
    if (!again) onClose();
    setState((s) => ({
      ...blank(funds, { type: s.type, sourceAccountId: s.sourceAccountId, destAccountId: s.destAccountId, date: s.date }),
      frequency: s.frequency,
    }));
    setMore(false);
    picks.load("");
    requestAnimationFrame(() => itemRef.current?.focus());
  }

  function handle(result: SaveResult, saved: RecordInput, again: boolean) {
    if (result.ok) return finish(saved, again, false);
    if ("needsCycle" in result) {
      setCycle({ date: result.needsCycle.date, start: result.needsCycle.suggestedStart, again });
      return;
    }
    setErrors(result.fields ?? {});
    setFormError(result.error);
  }

  async function submit(again: boolean) {
    if (busy) return;
    setFormError(null);
    // A plan item may have no date; the shared checks borrow the cycle's start, as the server does.
    const parsed = recordInput.safeParse(plan ? { ...input, date: input.date || plan.cycleStart } : input);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      if (!Number.isFinite(input.amount)) {
        fields.amount = state.amount.trim() ? "Use an amount like 18.000, 50rb or 1,5jt" : "Enter an amount";
      }
      if (!Number.isFinite(input.discount)) fields.discount = "Use an amount like 5.000 or 5rb";
      setErrors(fields);
      if (fields.item) itemRef.current?.focus();
      else if (fields.amount) amountRef.current?.focus();
      return;
    }
    const offlineSave = () => {
      enqueue(input);
      finish(input, again, true);
    };
    if (mode === "add" && !plan && !navigator.onLine) return offlineSave();
    setBusy(true);
    try {
      const result = plan
        ? await savePlanItem(plan.cycleId, { ...input, date: input.date || null, frequency: state.frequency }, mode)
        : await saveRecord(input, mode);
      handle(result, input, again);
    } catch {
      // The request never reached the server: keep a new record on the device, refuse an edit.
      if (mode === "add" && !plan) offlineSave();
      else setFormError("You're offline. Try again once you're back online.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCycle() {
    if (!cycle || busy) return;
    setBusy(true);
    try {
      handle(await startCycleAndSave(cycle.start, input, mode), input, cycle.again);
    } catch {
      setFormError("You're offline. Starting a cycle needs a connection.");
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.defaultPrevented) return;
    if (matchesShortcut(e.nativeEvent, data.shortcuts.saveAndAddAnother)) {
      e.preventDefault();
      submit(mode === "add");
    } else if (matchesShortcut(e.nativeEvent, data.shortcuts.close) && (handleEscape || data.shortcuts.close !== "escape")) {
      e.preventDefault();
      onClose();
    }
  }

  const err = (name: string) =>
    errors[name] ? (
      <p id={fid(`${name}-error`)} className="text-sm text-destructive">
        {errors[name]}
      </p>
    ) : null;
  const described = (name: string) => (errors[name] ? fid(`${name}-error`) : undefined);

  return (
    <form
      noValidate
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="relative min-h-0 flex-1">
        <div ref={scroller} className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none]">
          {/* One stable child, so the scroll thumb sees every change in content height. */}
          <div>
            <div className="bg-kraft px-5 pt-4 pb-5">
              <div className="flex items-center justify-between">
                {title}
                <Tip label="Close">
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mr-2.5 flex size-11 items-center justify-center rounded-button text-kraft-ink hover:bg-kraft-ink/10 hover:text-foreground"
                  >
                    <XIcon aria-hidden className="size-5" />
                  </button>
                </Tip>
              </div>

              <label htmlFor={fid("item")} className="mt-3 mb-2 block text-[0.8125rem] font-medium text-kraft-ink">
                Item
              </label>
              <ItemCombobox
                id={fid("item")}
                inputRef={itemRef}
                value={state.item}
                onChange={(v) => {
                  set("item", v);
                  if (state.planItemId) set("planItemId", null);
                }}
                onPick={pick}
                placeholder={plan ? "What are you planning for?" : undefined}
                invalid={!!errors.item}
                describedBy={described("item")}
              />
              {err("item")}

              {/* Grows open once something is typed, so the header expands rather than jumps. */}
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  started ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
                inert={!started}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mt-4 rounded-panel bg-window px-4 pt-3 pb-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor={fid("amount")} className="text-[0.8125rem] font-medium text-kraft-ink">
                        Amount
                      </label>
                      {amount !== null && /[a-z,]/i.test(state.amount) && (
                        <span className="figure text-sm text-kraft-ink">{formatMoney(amount)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-[2rem] font-medium text-kraft-ink">
                        Rp
                      </span>
                      <input
                        id={fid("amount")}
                        ref={amountRef}
                        value={state.amount}
                        onChange={(e) => set("amount", formatAmountInput(e.target.value))}
                        inputMode="numeric"
                        enterKeyHint="done"
                        autoComplete="off"
                        placeholder="0"
                        aria-invalid={!!errors.amount || undefined}
                        aria-describedby={described("amount")}
                        className="figure h-14 min-w-0 flex-1 bg-transparent text-[2.5rem] font-semibold tracking-tight outline-none placeholder:text-amount-placeholder"
                      />
                    </div>
                    <div className="mt-1 flex gap-2">
                      {[
                        ["rb", "thousand"],
                        ["jt", "million"],
                      ].map(([suffix, word]) => (
                        <button
                          key={suffix}
                          type="button"
                          aria-label={`Add ${suffix}, ${word}`}
                          onClick={() => {
                            const base = state.amount.replace(/(rb|k|jt)$/i, "");
                            set("amount", base ? `${base}${suffix}` : state.amount);
                            amountRef.current?.focus();
                          }}
                          className="h-11 min-w-14 rounded-button bg-kraft/50 px-3 text-[0.9375rem] font-medium text-kraft-ink hover:bg-kraft"
                        >
                          {suffix}
                        </button>
                      ))}
                      {showTotal && <span className="figure ml-auto self-center text-sm text-kraft-ink">Total {formatMoney(total)}</span>}
                    </div>
                    {err("amount")}
                  </div>
                </div>
              </div>
            </div>
            <div className="flap" aria-hidden />

            {!started ? (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
                <QuickPicks items={picks.items} onPick={pick} envelopes={data.envelopes} heading={plan ? "Plan from a past item" : "Record again"} />
              </div>
            ) : (
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
                <fieldset>
                  <legend className="sr-only">Type</legend>
                  <div className="relative grid grid-cols-4 gap-1 rounded-button bg-panel p-1">
                    <SlidingPill count={TYPES.length} index={TYPES.indexOf(state.type)} />
                    {TYPES.map((t) => (
                      <label key={t} className="relative">
                        <input
                          type="radio"
                          name={fid("type")}
                          value={t}
                          checked={state.type === t}
                          onChange={() => {
                            setState((s) => {
                              const next = withType(s, t, funds);
                              const keepSub = data.categories.some(
                                (c) => c.kind === CATEGORY_KIND[t] && c.subs.some((x) => x.id === s.subcategoryId),
                              );
                              return keepSub ? next : { ...next, subcategoryId: "", classification: "" };
                            });
                            setErrors({});
                          }}
                          className="peer sr-only"
                        />
                        <span className="flex h-11 cursor-pointer items-center justify-center rounded-field text-[0.9375rem] text-muted-foreground transition-colors duration-300 peer-checked:font-medium peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                          {TYPE_LABELS[t]}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {state.type !== "income" && (
                  <FundChips
                    name={fid("source")}
                    legend={state.type === "transfer" ? "From" : "Paid from"}
                    funds={funds.sources}
                    value={state.sourceAccountId}
                    onChange={(id) => set("sourceAccountId", id)}
                    error={errors.sourceAccountId}
                  />
                )}
                {(state.type === "income" || state.type === "transfer") && (
                  <FundChips
                    name={fid("dest")}
                    legend={state.type === "transfer" ? "To" : "Paid into"}
                    funds={funds.dests}
                    value={state.destAccountId}
                    onChange={(id) => set("destAccountId", id)}
                    error={errors.destAccountId}
                  />
                )}

                <div className="rounded-panel bg-panel">
                  <button
                    type="button"
                    aria-expanded={more}
                    aria-controls={fid("more")}
                    onClick={() => setMore((m) => !m)}
                    className="flex h-12 w-full items-center justify-between rounded-panel px-4 text-[0.9375rem]"
                  >
                    <span>
                      More
                      <span className="ml-2 text-sm text-muted-foreground">{moreSummary(state, data)}</span>
                    </span>
                    <CaretDownIcon weight="fill" aria-hidden className={cn("size-4 transition-transform", more && "rotate-180")} />
                  </button>
                  {/* Always rendered so it can grow and shrink; inert while closed so nothing in it takes focus. */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                      more ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                    inert={!more}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div id={fid("more")} className="grid grid-cols-2 gap-x-3 gap-y-4 px-4 pt-1 pb-4">
                        <Field label={plan ? "Date (optional)" : "Date"} htmlFor={fid("date")} error={err("date")} wide={!plan}>
                          <DateField
                            id={fid("date")}
                            value={state.date}
                            onChange={(v) => set("date", v)}
                            onClear={plan ? () => set("date", "") : undefined}
                          />
                        </Field>
                        {plan && (
                          <Field label="Frequency" htmlFor={fid("frequency")}>
                            <select
                              id={fid("frequency")}
                              value={state.frequency}
                              onChange={(e) => set("frequency", e.target.value as Frequency)}
                              className={cn(fieldClass, "capitalize")}
                            >
                              {FREQUENCIES.map((f) => (
                                <option key={f} value={f}>
                                  {f === "semiweekly" ? "Twice a week" : f[0].toUpperCase() + f.slice(1)}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                        {(state.type === "expense" || state.type === "saving" || state.type === "transfer") && (
                          <EnvelopeSelect
                            id={fid("source-envelope")}
                            label={state.type === "transfer" ? "From Budget" : "Budget"}
                            envelopes={data.envelopes}
                            value={state.sourceEnvelopeId}
                            onChange={(v) => set("sourceEnvelopeId", v)}
                            error={err("sourceEnvelopeId")}
                            wide={state.type !== "transfer"}
                          />
                        )}
                        {(state.type === "income" || state.type === "transfer") && (
                          <EnvelopeSelect
                            id={fid("dest-envelope")}
                            label={state.type === "transfer" ? "To Budget" : "Budget"}
                            envelopes={data.envelopes}
                            value={state.destEnvelopeId}
                            onChange={(v) => set("destEnvelopeId", v)}
                            error={err("destEnvelopeId")}
                            wide={state.type !== "transfer"}
                          />
                        )}
                        {categories.length > 0 && (
                          <Field label="Category" htmlFor={fid("sub")} error={err("subcategoryId")} wide>
                            <select
                              id={fid("sub")}
                              value={state.subcategoryId}
                              onChange={(e) => set("subcategoryId", e.target.value)}
                              className={fieldClass}
                            >
                              <option value="">Uncategorised</option>
                              {categories.map((c) => (
                                <optgroup key={c.id} label={c.name}>
                                  {c.subs.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </Field>
                        )}
                        {(state.type === "expense" || state.type === "saving") && (
                          <fieldset className="col-span-2">
                            <legend className={labelClass}>Needs or Wants</legend>
                            <div className="relative mt-2 grid grid-cols-2 gap-1 rounded-button bg-field p-1">
                              <SlidingPill
                                count={2}
                                index={({ needs: 0, wants: 1 } as const)[(state.classification || subcategory?.defaultClassification) as "needs" | "wants"] ?? null}
                              />
                              {(["needs", "wants"] as const).map((c) => {
                                const shown = (state.classification || subcategory?.defaultClassification) === c;
                                return (
                                  <button
                                    key={c}
                                    type="button"
                                    aria-pressed={shown}
                                    onClick={() => set("classification", state.classification === c ? "" : c)}
                                    className={cn(
                                      "relative h-10 rounded-field text-[0.9375rem] capitalize transition-colors duration-300",
                                      shown ? "font-medium" : "text-muted-foreground",
                                    )}
                                  >
                                    {c}
                                  </button>
                                );
                              })}
                            </div>
                          </fieldset>
                        )}
                        <Field label="Quantity" htmlFor={fid("qty")} error={err("quantity")}>
                          <input
                            id={fid("qty")}
                            value={state.quantity}
                            onChange={(e) => set("quantity", e.target.value)}
                            inputMode="decimal"
                            className={fieldClass}
                          />
                        </Field>
                        <Field label="Unit" htmlFor={fid("unit")}>
                          <input
                            id={fid("unit")}
                            value={state.unit}
                            onChange={(e) => set("unit", e.target.value)}
                            placeholder="liter, pcs"
                            className={fieldClass}
                          />
                        </Field>
                        <Field label="Discount" htmlFor={fid("discount")} error={err("discount")}>
                          <input
                            id={fid("discount")}
                            value={state.discount}
                            onChange={(e) => set("discount", formatAmountInput(e.target.value))}
                            inputMode="numeric"
                            placeholder="0"
                            className={cn(fieldClass, "figure")}
                          />
                        </Field>
                        <Field label="Location" htmlFor={fid("location")}>
                          <input
                            id={fid("location")}
                            value={state.location}
                            onChange={(e) => set("location", e.target.value)}
                            className={fieldClass}
                          />
                        </Field>
                        <Field label="Tags" htmlFor={fid("tags")} wide hint="Separate with commas">
                          <input
                            id={fid("tags")}
                            value={state.tags}
                            onChange={(e) => set("tags", e.target.value)}
                            className={fieldClass}
                          />
                        </Field>
                        <Field label="Note" htmlFor={fid("note")} wide>
                          <textarea
                            id={fid("note")}
                            value={state.note}
                            onChange={(e) => set("note", e.target.value)}
                            rows={2}
                            className={cn(fieldClass, "h-auto py-2.5")}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {cycle && (
                  <div role="alert" className="flex flex-col gap-3 rounded-panel bg-secondary/45 p-4">
                    <p>
                      No pay cycle covers {formatDate(cycle.date)} yet. Start one to save this record.
                    </p>
                    <Field label="Cycle starts on" htmlFor={fid("cycle-start")}>
                      <DateField
                        id={fid("cycle-start")}
                        value={cycle.start}
                        max={cycle.date}
                        onChange={(v) => setCycle({ ...cycle, start: v })}
                      />
                    </Field>
                    <Button type="button" size="lg" disabled={busy} onClick={confirmCycle}>
                      <PlayIcon weight="fill" aria-hidden className="size-5" />
                      Start cycle and save
                    </Button>
                  </div>
                )}
                {formError && !cycle && (
                  <p role="alert" className="rounded-panel bg-destructive-soft/50 p-4 text-sm text-destructive">
                    {formError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <ScrollThumb target={scroller} />
      </div>

      {started && (
        <div className="flex shrink-0 gap-2 bg-background px-5 pt-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ease-out motion-reduce:animate-none pb-[calc(0.75rem+env(safe-area-inset-bottom)+var(--drawer-keyboard-inset,0px))]">
          {mode === "add" ? (
            <>
              <Button type="button" variant="secondary" size="lg" disabled={busy} onClick={() => submit(true)} className="flex-1">
                Save & add another
              </Button>
              <Button type="submit" size="lg" disabled={busy} className="flex-1">
                <CheckCircleIcon weight="fill" aria-hidden className="size-5" />
                {plan ? "Add to plan" : "Save"}
              </Button>
            </>
          ) : (
            <Button type="submit" size="lg" disabled={busy} className="flex-1">
              <CheckCircleIcon weight="fill" aria-hidden className="size-5" />
              Save changes
            </Button>
          )}
        </div>
      )}
    </form>
  );
}

const labelClass = "text-[0.8125rem] font-medium text-muted-foreground";
const fieldClass =
  "h-11 w-full min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--secondary)]";

function Field({
  label,
  htmlFor,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: React.ReactNode;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", wide && "col-span-2")}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
        {hint && <span className="font-normal"> · {hint}</span>}
      </label>
      {children}
      {error}
    </div>
  );
}

function EnvelopeSelect({
  id,
  label,
  envelopes,
  value,
  onChange,
  error,
  wide,
}: {
  id: string;
  label: string;
  envelopes: RecordData["envelopes"];
  value: string;
  onChange: (v: string) => void;
  error: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Field label={label} htmlFor={id} error={error} wide={wide}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        <option value="">Default (Unallocated)</option>
        {envelopes
          .filter((e) => !e.isSystem)
          .map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
      </select>
    </Field>
  );
}

function moreSummary(s: State, data: RecordData) {
  const parts = [s.date && s.date !== today() ? formatDate(s.date) : null];
  const env = data.envelopes.find((e) => e.id === (s.type === "income" ? s.destEnvelopeId : s.sourceEnvelopeId));
  if (env && !env.isSystem) parts.push(env.name);
  const sub = data.categories.flatMap((c) => c.subs).find((x) => x.id === s.subcategoryId);
  if (sub) parts.push(sub.name);
  return parts.filter(Boolean).join(" · ") || "Date, Budget, category";
}

function FundChips({
  name,
  legend,
  funds,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  funds: Funds["sources"];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className={cn(labelClass, "mb-2")}>{legend}</legend>
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {funds.map((a) => (
          <label key={a.id} className="shrink-0">
            <input
              type="radio"
              name={name}
              value={a.id}
              checked={value === a.id}
              onChange={() => onChange(a.id)}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center rounded-button bg-panel px-4 text-[0.9375rem] whitespace-nowrap text-muted-foreground peer-checked:bg-secondary peer-checked:font-medium peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
              {a.name}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}

function QuickPicks({
  items,
  onPick,
  envelopes,
  heading,
}: {
  heading: string;
  items: Suggestion[];
  onPick: (s: Suggestion) => void;
  envelopes: RecordData["envelopes"];
}) {
  const hue = (s: Suggestion) =>
    envelopes.find((e) => e.id === (s.fill.type === "income" ? s.fill.destEnvelopeId : s.fill.sourceEnvelopeId))?.hue;
  if (items.length === 0) {
    return (
      <p className="px-5 pt-5 text-muted-foreground">
        Type what you paid for. Items you record often appear here, so a repeat takes one tap.
      </p>
    );
  }
  return (
    <section aria-label="Recent items" className="px-5 pt-4 pb-6">
      <h2 className="mb-2 text-sm font-medium">{heading}</h2>
      <ul className="rounded-panel bg-panel">
        {items.map((s) => (
          <li key={s.key} className="border-t border-divider first:border-t-0">
            <button
              type="button"
              onClick={() => onPick(s)}
              className="flex min-h-13 w-full items-center justify-between gap-3 rounded-panel px-4 py-3 text-left text-[0.9375rem]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: hue(s) ?? "var(--track)" }} />
                <span className="truncate">{s.item}</span>
              </span>
              <span className="figure shrink-0 text-muted-foreground">{suggestionHint(s)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A date shown as 'Sat, Nov 7' so it can't be misread as day/month, with the native picker on top
 * (invisible) so tapping it still opens the system date picker.
 */
export function DateField({
  id,
  value,
  max,
  onChange,
  onClear,
}: {
  id: string;
  value: string;
  max?: string;
  onChange: (v: string) => void;
  /** Offers a Clear button, for dates that may be left empty. */
  onClear?: () => void;
}) {
  return (
    <div className="flex gap-1">
      <div className="relative flex h-11 min-w-0 flex-1 items-center rounded-field bg-field px-3 focus-within:shadow-[0_0_0_2px_var(--secondary)]">
        <span aria-hidden className={cn(!value && "text-muted-foreground")}>{value ? formatDate(value) : onClear ? "No date" : "Pick a date"}</span>
        <input
          id={id}
          type="date"
          value={value}
          max={max}
          required={!onClear}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
      {onClear && value && (
        <button type="button" onClick={onClear} className="h-11 shrink-0 rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground">
          Clear
        </button>
      )}
    </div>
  );
}
