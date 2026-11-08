"use client";

import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { createContext, use, useId, useState } from "react";
import { deleteRecord, saveRecord } from "@/app/(app)/actions";
import { toasts } from "@/components/record/toast";
import { Button } from "@/components/ui/button";
import { formatAmountInput, formatMoney, parseAmount } from "@/lib/format";

type Option = { id: string; name: string };
type Props = {
  budgets: (Option & { isSystem: boolean })[];
  funds: Option[];
  /** Balance per `fund|budget`, to show what each Fund holds and to pick the default Fund. */
  pairs: Record<string, number>;
  date: string;
  children: React.ReactNode;
};

const AllocateContext = createContext<(to?: string) => void>(() => {});
export const useAllocate = () => use(AllocateContext);

const field = "h-11 w-full min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--secondary)]";
const label = "flex flex-col gap-2 text-[0.8125rem] font-medium text-muted-foreground";

/**
 * Allocate: a Transfer inside one Fund from one Budget to another, from Unallocated unless changed.
 * The Fund defaults to whichever holds the most in the source Budget.
 */
export function AllocateProvider({ budgets, funds, pairs, date, children }: Props) {
  const unallocated = budgets.find((b) => b.isSystem)?.id ?? "";
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(unallocated);
  const [to, setTo] = useState("");
  const [fund, setFund] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uid = useId();

  const held = (fundId: string, budgetId: string) => pairs[`${fundId}|${budgetId}`] ?? 0;
  const richest = (budgetId: string) =>
    [...funds].sort((a, b) => held(b.id, budgetId) - held(a.id, budgetId))[0]?.id ?? "";

  function start(target?: string) {
    setFrom(unallocated);
    setTo(target && target !== unallocated ? target : "");
    setFund(richest(unallocated));
    setAmount("");
    setError(null);
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!to) return setError("Pick the Budget to fill");
    if (!value || value <= 0) return setError("Enter an amount like 500rb or 1,5jt");
    const target = budgets.find((b) => b.id === to)!;
    const input = {
      id: crypto.randomUUID(),
      item: `Allocate to ${target.name}`,
      type: "transfer" as const,
      sourceAccountId: fund,
      destAccountId: fund,
      sourceEnvelopeId: from,
      destEnvelopeId: to,
      amount: value,
      date,
    };
    setBusy(true);
    try {
      const result = await saveRecord(input);
      if (!result.ok) return setError("error" in result ? result.error : "No open pay cycle covers today. Start one on Cycles.");
      setOpen(false);
      const id = toasts.add({
        title: `Allocated ${formatMoney(value)} to ${target.name}`,
        timeout: 6000,
        actionProps: {
          children: "Undo",
          async onClick() {
            toasts.close(id);
            const removed = await deleteRecord(input.id);
            toasts.add({ title: removed ? "Allocation undone" : "Couldn't undo that", timeout: 3000 });
          },
        },
      });
    } catch {
      setError("You're offline. Allocating needs a connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AllocateContext value={start}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/35 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
            <Dialog.Popup className="w-full overflow-hidden rounded-t-sheet bg-background pb-[env(safe-area-inset-bottom)] outline-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:translate-y-full data-starting-style:translate-y-full lg:max-w-md lg:rounded-sheet lg:transition-[opacity,scale] lg:data-ending-style:translate-y-0 lg:data-ending-style:scale-95 lg:data-ending-style:opacity-0 lg:data-starting-style:translate-y-0 lg:data-starting-style:scale-95 lg:data-starting-style:opacity-0">
              <form noValidate onSubmit={submit}>
                <div className="bg-kraft px-5 pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <Dialog.Title className="text-base font-medium">Allocate</Dialog.Title>
                    <Dialog.Close className="-mr-3 h-11 rounded-button px-3 text-[0.9375rem] text-kraft-ink hover:bg-kraft-ink/10">
                      Close
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="mt-1 text-[0.8125rem] text-kraft-ink">
                    Moves money between Budgets inside one Fund. It&apos;s saved as a Transfer.
                  </Dialog.Description>
                  <div className="mt-3 rounded-panel bg-window px-4 pt-3 pb-3">
                    <label htmlFor={`${uid}-amount`} className="text-[0.8125rem] font-medium text-kraft-ink">
                      Amount
                    </label>
                    <div className="flex items-center gap-2">
                      <span aria-hidden className="text-[2rem] font-medium text-kraft-ink">
                        Rp
                      </span>
                      <input
                        id={`${uid}-amount`}
                        value={amount}
                        onChange={(e) => setAmount(formatAmountInput(e.target.value))}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="0"
                        className="figure h-14 min-w-0 flex-1 bg-transparent text-[2.5rem] font-semibold tracking-tight outline-none placeholder:text-amount-placeholder"
                      />
                    </div>
                  </div>
                </div>
                <div className="flap" aria-hidden />
                <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 pt-4 pb-5">
                  <label className={label}>
                    From Budget
                    <select
                      value={from}
                      onChange={(e) => {
                        setFrom(e.target.value);
                        setFund(richest(e.target.value));
                      }}
                      className={field}
                    >
                      {budgets.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={label}>
                    To Budget
                    <select value={to} onChange={(e) => setTo(e.target.value)} className={field}>
                      <option value="" disabled>
                        Pick one
                      </option>
                      {budgets
                        .filter((b) => b.id !== from)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className={`${label} col-span-2`}>
                    Fund
                    <select value={fund} onChange={(e) => setFund(e.target.value)} className={field}>
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} · {formatMoney(held(f.id, from))} in {budgets.find((b) => b.id === from)?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {error && (
                    <p role="alert" className="col-span-2 rounded-panel bg-destructive-soft/50 p-4 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button type="submit" size="lg" disabled={busy} className="col-span-2">
                    <ArrowsLeftRightIcon weight="fill" aria-hidden className="size-5" />
                    Allocate
                  </Button>
                </div>
              </form>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </AllocateContext>
  );
}

/** Opens Allocate, optionally aimed at one Budget. */
export function AllocateButton({
  to,
  children,
  ...rest
}: { to?: string } & Omit<React.ComponentProps<"button">, "type">) {
  const allocate = useAllocate();
  // The rest (aria-label, ref, pointer handlers) lets a Tip name an icon-only Allocate.
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => {
        rest.onClick?.(e);
        allocate(to);
      }}
    >
      {children}
    </button>
  );
}
