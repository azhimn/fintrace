"use client";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { deleteEnvelope, reorder, saveAccount, saveCategory, saveEnvelope, saveSubcategory } from "@/app/(app)/actions";
import { fieldClass, RowMenu, ToggleChip, useAction } from "@/components/shell/action";
import { HueDot } from "@/components/shell/bits";
import { Button } from "@/components/ui/button";
import { formatAmountInput, parseAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kind = "bank" | "e_wallet" | "cash" | "external";
export type Fund = { id: string; name: string; kind: Kind; minBalance: number; countsAsUsable: boolean; archived: boolean };
export type Budget = { id: string; name: string; isSystem: boolean; hue: string };
export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense" | "saving";
  archived: boolean;
  subs: { id: string; name: string; defaultClassification: "needs" | "wants" | null; defaultEnvelopeId: string | null }[];
};

const KINDS = { bank: "Bank", e_wallet: "E-wallet", cash: "Cash" } as const;
const CATEGORY_KINDS = { expense: "Expense", income: "Income", saving: "Saving" } as const;
const sr = "sr-only";

/** The ids with `id` swapped with its neighbour, or null at an edge. Only rows passing `same` count as neighbours. */
function moved<T extends { id: string }>(rows: T[], id: string, step: -1 | 1, same: (a: T) => boolean = () => true) {
  const ids = rows.map((r) => r.id);
  const at = ids.indexOf(id);
  let to = at + step;
  while (to >= 0 && to < rows.length && !same(rows[to])) to += step;
  if (to < 0 || to >= rows.length) return null;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  return ids;
}

function Order({ name, up, down, run }: { name: string; up: string[] | null; down: string[] | null; run: (ids: string[]) => void }) {
  const button =
    "flex size-11 shrink-0 items-center justify-center rounded-button text-quiet-control hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <span className="flex shrink-0">
      <button type="button" aria-label={`Move ${name} up`} disabled={!up} onClick={() => up && run(up)} className={button}>
        <CaretUpIcon weight="fill" className="size-4" />
      </button>
      <button type="button" aria-label={`Move ${name} down`} disabled={!down} onClick={() => down && run(down)} className={button}>
        <CaretDownIcon weight="fill" className="size-4" />
      </button>
    </span>
  );
}

/** A text field that saves when it loses focus with a changed, non-empty value. */
function SavedText({ label, value, onSave, className }: { label: string; value: string; onSave: (v: string) => void; className?: string }) {
  const [text, setText] = useState(value);
  return (
    <label className={cn("min-w-0", className)}>
      <span className={sr}>{label}</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const next = text.trim();
          if (!next) return setText(value);
          if (next !== value) onSave(next);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        autoComplete="off"
        className={cn(fieldClass, "-ml-3 bg-transparent hover:bg-field focus-visible:bg-field")}
      />
    </label>
  );
}

function AddRow({ placeholder, children, onAdd }: { placeholder: string; children?: React.ReactNode; onAdd: (name: string) => Promise<string | null> }) {
  const [name, setName] = useState("");
  const { run, pending, alert } = useAction();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => onAdd(name), `Added ${name.trim()}`, () => setName(""));
      }}
      className="flex flex-col gap-2 border-t border-divider px-4 py-3"
    >
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40 flex-1">
          <span className={sr}>{placeholder}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} autoComplete="off" className={fieldClass} />
        </label>
        {children}
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-11 text-[0.9375rem]">
          Add
        </Button>
      </div>
      {alert}
    </form>
  );
}

export function FundSettings({ funds }: { funds: Fund[] }) {
  const own = funds.filter((f) => f.kind !== "external");
  const external = funds.find((f) => f.kind === "external");
  const [kind, setKind] = useState<keyof typeof KINDS>("bank");
  // External stays last in the stored order, out of the way.
  const all = (ids: string[]) => (external ? [...ids, external.id] : ids);
  return (
    <ul className="rounded-panel bg-panel">
      {own.map((f) => (
        <FundRow
          key={f.id}
          fund={f}
          up={moved(own, f.id, -1)}
          down={moved(own, f.id, 1)}
          order={(ids) => reorder("accounts", all(ids))}
        />
      ))}
      {external && (
        <li className="border-t border-divider px-4 py-3 first:border-t-0">
          <span className="block text-[0.9375rem]">{external.name}</span>
          <span className="mt-px block text-xs text-muted-foreground">
            Built in. It stands for anyone outside your Funds, has no balance and can&apos;t be changed.
          </span>
        </li>
      )}
      <li>
        <AddRow placeholder="New Fund name" onAdd={(name) => saveAccount(null, { name, kind })}>
          <label>
            <span className={sr}>Kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as keyof typeof KINDS)} className={cn(fieldClass, "w-32")}>
              {Object.entries(KINDS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </AddRow>
      </li>
    </ul>
  );
}

function FundRow({ fund, up, down, order }: { fund: Fund; up: string[] | null; down: string[] | null; order: (ids: string[]) => Promise<string | null> }) {
  const { run, pending, alert } = useAction();
  const [min, setMin] = useState(fund.minBalance ? formatAmountInput(String(fund.minBalance)) : "");
  const save = (patch: Partial<Fund>, done?: string) => run(() => saveAccount(fund.id, patch), done);
  return (
    <li className={cn("border-t border-divider px-4 py-3 first:border-t-0", fund.archived && "[&_input]:text-muted-foreground")}>
      <div className="flex items-center gap-2">
        <SavedText label="Name" value={fund.name} onSave={(name) => save({ name }, `Renamed to ${name}`)} className="flex-1" />
        <Order name={fund.name} up={up} down={down} run={(ids) => run(() => order(ids))} />
        <RowMenu
          label={`Actions for ${fund.name}`}
          actions={[
            fund.archived
              ? { label: "Restore", onClick: () => save({ archived: false }, `${fund.name} is back`) }
              : { label: "Archive", onClick: () => save({ archived: true }, `${fund.name} archived`) },
          ]}
        />
      </div>
      {fund.archived && <p className="mb-1 text-xs text-muted-foreground">Archived: hidden from Record and the Overview</p>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label>
          <span className={sr}>Kind of {fund.name}</span>
          <select
            value={fund.kind}
            disabled={pending}
            onChange={(e) => save({ kind: e.target.value as Kind })}
            className={fieldClass}
          >
            {Object.entries(KINDS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="relative">
          <span className={sr}>Minimum balance for {fund.name}</span>
          <span aria-hidden className="pointer-events-none absolute top-2.5 left-3 text-sm text-muted-foreground">
            Keep
          </span>
          <input
            value={min}
            onChange={(e) => setMin(formatAmountInput(e.target.value))}
            onBlur={() => {
              const value = min.trim() ? parseAmount(min) : 0;
              if (value === null || value < 0) return run(async () => "Enter a minimum like 50rb, or leave it empty");
              if (value !== fund.minBalance) save({ minBalance: value }, `${fund.name} keeps ${formatAmountInput(String(value)) || 0} minimum`);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Rp 0"
            className={cn(fieldClass, "figure pl-14")}
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <ToggleChip checked={fund.countsAsUsable} disabled={pending} onChange={(countsAsUsable) => save({ countsAsUsable })}>
          Counts as usable
        </ToggleChip>
      </div>
      {alert && <div className="mt-2">{alert}</div>}
    </li>
  );
}

export function BudgetSettings({ budgets }: { budgets: Budget[] }) {
  return (
    <ul className="rounded-panel bg-panel">
      {budgets.map((b) => (
        <BudgetRow
          key={b.id}
          budget={b}
          up={moved(budgets, b.id, -1)}
          down={moved(budgets, b.id, 1)}
        />
      ))}
      <li>
        <AddRow placeholder="New Budget name" onAdd={(name) => saveEnvelope(null, { name })} />
      </li>
    </ul>
  );
}

function BudgetRow({ budget, up, down }: { budget: Budget; up: string[] | null; down: string[] | null }) {
  const { run, alert } = useAction();
  return (
    <li className="border-t border-divider py-1.5 pr-1 pl-4 first:border-t-0">
      <div className="flex items-center gap-4">
        <HueDot hue={budget.hue} />
        <SavedText
          label={`Name of ${budget.name}`}
          value={budget.name}
          onSave={(name) => run(() => saveEnvelope(budget.id, { name }), `Renamed to ${name}`)}
          className="flex-1"
        />
        <Order name={budget.name} up={up} down={down} run={(ids) => run(() => reorder("envelopes", ids))} />
        {budget.isSystem ? (
          <span className="size-11 shrink-0" />
        ) : (
          <RowMenu
            label={`Actions for ${budget.name}`}
            actions={[{ label: "Delete", destructive: true, onClick: () => run(() => deleteEnvelope(budget.id), `Deleted ${budget.name}`) }]}
          />
        )}
      </div>
      {alert && <div className="mt-1 mr-3 mb-1.5">{alert}</div>}
    </li>
  );
}

export function CategorySettings({ categories, budgets }: { categories: Category[]; budgets: Budget[] }) {
  const [kind, setKind] = useState<keyof typeof CATEGORY_KINDS>("expense");
  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(CATEGORY_KINDS) as (keyof typeof CATEGORY_KINDS)[]).map((k) => {
        const list = categories.filter((c) => c.kind === k);
        if (!list.length) return null;
        return (
          <div key={k}>
            <h3 className="mb-2 px-1 text-[0.8125rem] font-medium text-muted-foreground">{CATEGORY_KINDS[k]}</h3>
            <ul className="rounded-panel bg-panel">
              {list.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  budgets={budgets}
                  up={moved(categories, c.id, -1, (o) => o.kind === k)}
                  down={moved(categories, c.id, 1, (o) => o.kind === k)}
                />
              ))}
            </ul>
          </div>
        );
      })}
      <ul className="rounded-panel bg-panel">
        <li>
          <AddRow placeholder="New category name" onAdd={(name) => saveCategory(null, { name, kind })}>
            <label>
              <span className={sr}>Kind</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as keyof typeof CATEGORY_KINDS)} className={cn(fieldClass, "w-32")}>
                {Object.entries(CATEGORY_KINDS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </AddRow>
        </li>
      </ul>
    </div>
  );
}

function CategoryRow({ category, budgets, up, down }: { category: Category; budgets: Budget[]; up: string[] | null; down: string[] | null }) {
  const { run, alert } = useAction();
  const unset = category.kind === "expense" && category.subs.filter((s) => !s.defaultEnvelopeId).length;
  return (
    <li className="border-t border-divider first:border-t-0">
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-panel px-4 py-2 hover:bg-accent [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className={cn("block truncate text-[0.9375rem]", category.archived && "text-muted-foreground")}>{category.name}</span>
            <span className="mt-px block text-xs text-muted-foreground">
              {[
                `${category.subs.length} ${category.subs.length === 1 ? "subcategory" : "subcategories"}`,
                unset ? `${unset} without a default Budget` : null,
                category.archived ? "Archived" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
          <CaretDownIcon weight="fill" aria-hidden className="size-4 shrink-0 text-quiet-control transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-3">
          <span className="text-xs text-muted-foreground">Name</span>
          <div className="flex items-center gap-2">
            <SavedText
              label={`Name of ${category.name}`}
              value={category.name}
              onSave={(name) => run(() => saveCategory(category.id, { name }), `Renamed to ${name}`)}
              className="flex-1"
            />
            <Order name={category.name} up={up} down={down} run={(ids) => run(() => reorder("categories", ids))} />
            <RowMenu
              label={`Actions for ${category.name}`}
              actions={[
                category.archived
                  ? { label: "Restore", onClick: () => run(() => saveCategory(category.id, { archived: false }), `${category.name} is back`) }
                  : { label: "Archive", onClick: () => run(() => saveCategory(category.id, { archived: true }), `${category.name} archived`) },
              ]}
            />
          </div>
          {alert && <div className="mt-2">{alert}</div>}
          <ul className="mt-3 overflow-hidden rounded-field bg-background">
            {category.subs.map((s) => (
              <SubRow key={s.id} sub={s} categoryId={category.id} budgets={budgets} classified={category.kind === "expense"} />
            ))}
            <li>
              <AddRow placeholder="New subcategory" onAdd={(name) => saveSubcategory(null, category.id, { name })} />
            </li>
          </ul>
        </div>
      </details>
    </li>
  );
}

function SubRow({ sub, categoryId, budgets, classified }: { sub: Category["subs"][number]; categoryId: string; budgets: Budget[]; classified: boolean }) {
  const { run, pending, alert } = useAction();
  const save = (patch: Partial<typeof sub>, done?: string) => run(() => saveSubcategory(sub.id, categoryId, patch), done);
  return (
    <li className="border-t border-divider px-4 py-3 first:border-t-0">
      <SavedText label="Subcategory name" value={sub.name} onSave={(name) => save({ name }, `Renamed to ${name}`)} />
      <div className={cn("mt-2 grid gap-2", classified && "grid-cols-2")}>
        {classified && (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Usually
            <select
              value={sub.defaultClassification ?? ""}
              disabled={pending}
              onChange={(e) => save({ defaultClassification: (e.target.value || null) as "needs" | "wants" | null })}
              className={fieldClass}
            >
              <option value="">Not set</option>
              <option value="needs">Needs</option>
              <option value="wants">Wants</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Default Budget
          <select
            value={sub.defaultEnvelopeId ?? ""}
            disabled={pending}
            onChange={(e) => save({ defaultEnvelopeId: e.target.value || null })}
            className={fieldClass}
          >
            <option value="">Unallocated</option>
            {budgets
              .filter((b) => !b.isSystem)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      {alert && <div className="mt-2">{alert}</div>}
    </li>
  );
}
