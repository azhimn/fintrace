"use client";

import { CaretDownIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { addCount, deleteCount, deleteRecord, saveRecord } from "@/app/(app)/actions";
import { toasts } from "@/components/record/toast";
import { fieldClass, useAction } from "@/components/shell/action";
import { Money } from "@/components/shell/bits";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { formatAmountInput, formatDateTime, formatMoney, parseAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

/** SPEC section 2: the notes counted one by one, then coins as a single amount. */
const NOTES = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000];

type Props = {
  cycleId: string;
  account: { id: string; name: string; kind: string; countsAsUsable: boolean; minBalance: number };
  /** The recorded balance. */
  computed: number;
  /** Latest count minus the recorded balance, null before the first count. */
  difference: number | null;
  /** Counts this cycle, newest first. */
  history: { id: string; counted: number; countedAt: Date; note: string | null }[];
  open: boolean;
  external: string;
  /** The date an adjustment gets. */
  adjustOn: string;
};

/** One Fund on Reconcile: its recorded balance, a field for what was counted, and the difference. */
export function CountRow({ cycleId, account, computed, difference, history, open, external, adjustOn }: Props) {
  const [text, setText] = useState("");
  const [calculator, setCalculator] = useState(false);
  const { run, pending, alert, setError } = useAction();
  const id = useId();
  const latest = history[0];

  function save(e: React.FormEvent) {
    e.preventDefault();
    const counted = parseAmount(text);
    if (counted === null) return setError("Enter the amount you counted, like 1.250.000 or 1,25jt");
    run(() => addCount(cycleId, { accountId: account.id, counted }), `Counted ${account.name}`, () => {
      setText("");
      setCalculator(false);
    });
  }

  function adjust() {
    if (!difference) return;
    const input = {
      id: crypto.randomUUID(),
      item: `Reconcile ${account.name}`,
      ...(difference > 0
        ? { type: "income" as const, sourceAccountId: external, destAccountId: account.id }
        : { type: "expense" as const, sourceAccountId: account.id, destAccountId: external }),
      amount: Math.abs(difference),
      date: adjustOn,
      note: `Adjusted to the ${formatMoney(latest.counted)} counted`,
    };
    run(async () => {
      const result = await saveRecord(input);
      if (!result.ok) return "error" in result ? result.error : "No open cycle holds that date";
      const toast = toasts.add({
        title: `${account.name} now matches the count`,
        timeout: 6000,
        actionProps: {
          children: "Undo",
          async onClick() {
            toasts.close(toast);
            const removed = await deleteRecord(input.id);
            toasts.add({ title: removed ? "Adjustment undone" : "Couldn't undo that", timeout: 3000 });
          },
        },
      });
      return null;
    });
  }

  return (
    <li className="border-t border-divider px-4 py-3 first:border-t-0">
      <div className="flex items-start justify-between gap-4 text-[0.9375rem]">
        <span className="min-w-0">
          {account.name}
          <span className="mt-px block text-xs text-muted-foreground">
            {account.minBalance > 0 ? `Recorded · keeps ${formatMoney(account.minBalance)} minimum` : "Recorded"}
          </span>
        </span>
        <Money value={computed} />
      </div>

      {latest && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="min-w-0 text-[0.9375rem]">
            Counted <Money value={latest.counted} />
            <span className="mt-px block text-xs text-muted-foreground">{formatDateTime(latest.countedAt)}</span>
          </span>
          <span className="flex items-center gap-2">
            {difference === 0 ? (
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">Matches</span>
            ) : (
              <span className="rounded-full bg-destructive-soft/50 px-2.5 py-0.5 text-xs text-destructive">
                <span className="figure">{formatMoney(Math.abs(difference!))}</span> {difference! > 0 ? "more" : "short"}
              </span>
            )}
            {open && difference !== 0 && (
              <Button variant="secondary" disabled={pending} onClick={adjust} className="h-11 px-4 text-[0.9375rem]">
                Adjust
              </Button>
            )}
          </span>
        </div>
      )}

      {open && (
        <form noValidate onSubmit={save} className="mt-3 flex flex-col gap-3">
          <label htmlFor={id} className="sr-only">
            Counted balance for {account.name}
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <span aria-hidden className="pointer-events-none absolute top-2.5 left-3 text-muted-foreground">
                Rp
              </span>
              <input
                id={id}
                value={text}
                onChange={(e) => setText(formatAmountInput(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder={latest ? "Count again" : "What you counted"}
                className={cn(fieldClass, "figure pl-10")}
              />
            </div>
            <Tip label="Save count">
              <Button type="submit" size="lg" disabled={pending} className="size-11 px-0">
                <CheckCircleIcon weight="fill" aria-hidden className="size-5" />
              </Button>
            </Tip>
          </div>
          {account.kind === "cash" && (
            <button
              type="button"
              aria-expanded={calculator}
              onClick={() => setCalculator((c) => !c)}
              className="-ml-3 flex h-11 items-center gap-1.5 self-start rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Count notes and coins
              <CaretDownIcon weight="fill" aria-hidden className={cn("size-4 transition-transform", calculator && "rotate-180")} />
            </button>
          )}
          {calculator && <CashCalculator onTotal={(total) => setText(formatAmountInput(String(total)))} />}
          {alert}
        </form>
      )}

      {history.length > 1 && (
        <details className="group mt-1">
          <summary className="-ml-3 flex h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden">
            {history.length} counts this cycle
            <CaretDownIcon weight="fill" aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-1 mb-1 overflow-hidden rounded-field bg-field">
            {history.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between gap-3 border-t border-divider py-1 pl-3 first:border-t-0">
                <span className="min-w-0 text-sm">
                  <Money value={c.counted} />
                  <span className="mt-px block text-xs text-muted-foreground">
                    {formatDateTime(c.countedAt)}
                    {i === 0 && " · used for the difference"}
                  </span>
                </span>
                {open ? (
                  <button
                    type="button"
                    onClick={() => run(() => deleteCount(c.id), "Count removed")}
                    className="h-11 shrink-0 rounded-button px-3 text-sm text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="h-11" />
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/** Notes counted one by one plus coins as an amount; every change sends the total up. */
function CashCalculator({ onTotal }: { onTotal: (total: number) => void }) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [coins, setCoins] = useState("");
  const uid = useId();
  const total = (c: Record<number, string>, coinText: string) =>
    NOTES.reduce((s, note) => s + note * (Number(c[note]) || 0), 0) + (parseAmount(coinText) ?? 0);

  return (
    <div className="pt-1">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        {NOTES.map((note) => (
          <label key={note} className="flex flex-col gap-2 text-[0.8125rem] font-medium text-muted-foreground">
            <span className="figure">{formatMoney(note)}</span>
            <input
              value={counts[note] ?? ""}
              onChange={(e) => {
                const next = { ...counts, [note]: e.target.value.replace(/\D/g, "").slice(0, 4) };
                setCounts(next);
                onTotal(total(next, coins));
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-label={`Number of ${formatMoney(note)} notes`}
              className={cn(fieldClass, "figure")}
            />
          </label>
        ))}
        <label htmlFor={`${uid}-coins`} className="flex flex-col gap-2 text-[0.8125rem] font-medium text-muted-foreground">
          Coins, total
          <input
            id={`${uid}-coins`}
            value={coins}
            onChange={(e) => {
              const next = formatAmountInput(e.target.value);
              setCoins(next);
              onTotal(total(counts, next));
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            className={cn(fieldClass, "figure")}
          />
        </label>
      </div>
      <p className="mt-3 flex items-center justify-between text-[0.9375rem]">
        <span className="text-muted-foreground">Total, filled in above</span>
        <Money value={total(counts, coins)} />
      </p>
    </div>
  );
}
