"use client";

import { CaretDownIcon, CheckCircleIcon, PlusCircleIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { deleteWish, saveWish, setAcquired } from "@/app/(app)/actions";
import { useRecord } from "@/components/record/record-provider";
import { fieldClass, labelClass, RowMenu, useAction } from "@/components/shell/action";
import { Empty, Section } from "@/components/shell/bits";
import { Button } from "@/components/ui/button";
import { lineTotal } from "@/lib/finance";
import { formatAmountInput, formatMoney, formatQuantity, parseAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Wish = {
  id: string;
  item: string;
  reason: string | null;
  price: number;
  category: string | null;
  priority: number;
  relativePriority: number;
  unit: string | null;
  time: "Once" | "Monthly" | "Quarterly";
  quantity: string;
  discount: number;
  acquired: boolean;
  total: number | null;
};

const CATEGORIES = ["QoL", "Self Improvement", "Fashion", "Maintenance"];
const TIMES = ["Once", "Monthly", "Quarterly"] as const;

type Form = {
  id: string;
  item: string;
  price: string;
  quantity: string;
  unit: string;
  discount: string;
  category: string;
  priority: string;
  relativePriority: string;
  time: Wish["time"];
  reason: string;
};

const blank = (): Form => ({
  id: crypto.randomUUID(),
  item: "",
  price: "",
  quantity: "1",
  unit: "",
  discount: "",
  category: "",
  priority: "",
  relativePriority: "",
  time: "Once",
  reason: "",
});

const fromWish = (w: Wish): Form => ({
  id: w.id,
  item: w.item,
  price: formatAmountInput(String(w.price)),
  quantity: formatQuantity(w.quantity),
  unit: w.unit ?? "",
  discount: w.discount ? formatAmountInput(String(w.discount)) : "",
  category: w.category ?? "",
  priority: String(w.priority),
  relativePriority: String(w.relativePriority),
  time: w.time,
  reason: w.reason ?? "",
});

/** The wishlist, sorted by priority then relative priority, with the add and edit form beside it. */
export function Wishlist({ items }: { items: Wish[] }) {
  const [form, setForm] = useState<Form>(blank);
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const open = items.filter((w) => !w.acquired);
  const acquired = items.filter((w) => w.acquired);
  const categories = [...new Set([...CATEGORIES, ...items.map((w) => w.category).filter((c): c is string => !!c)])];

  function edit(w: Wish) {
    setForm(fromWish(w));
    setEditing(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div>
        <Section title="Wishes">
          {open.length === 0 ? (
            <Empty>Nothing on the list. Add what you want to buy, with a priority, and it lines up here.</Empty>
          ) : (
            <ul className="rounded-panel bg-panel">
              {open.map((w) => (
                <WishRow key={w.id} wish={w} onEdit={() => edit(w)} />
              ))}
            </ul>
          )}
        </Section>
        {acquired.length > 0 && (
          <Section title={`Acquired · ${acquired.length}`}>
            <ul className="rounded-panel bg-panel">
              {acquired.map((w) => (
                <WishRow key={w.id} wish={w} onEdit={() => edit(w)} />
              ))}
            </ul>
          </Section>
        )}
      </div>
      <Section title={editing ? "Edit wish" : "Add a wish"} className="scroll-mt-4">
        <WishForm
          formRef={formRef}
          form={form}
          setForm={setForm}
          editing={editing}
          categories={categories}
          onDone={() => {
            setForm(blank());
            setEditing(false);
          }}
        />
      </Section>
    </div>
  );
}

function WishRow({ wish, onEdit }: { wish: Wish; onEdit: () => void }) {
  const { open } = useRecord();
  const { run, pending, alert } = useAction();
  const total = wish.total ?? lineTotal({ quantity: wish.quantity, amount: wish.price, discount: wish.discount });
  const meta = [
    `Priority ${wish.priority}`,
    wish.category,
    wish.time !== "Once" ? wish.time : null,
    Number(wish.quantity) !== 1 ? `${formatQuantity(wish.quantity)} ${wish.unit ?? "×"} at ${formatMoney(wish.price)}` : null,
  ].filter(Boolean);

  return (
    <li className="border-t border-divider px-4 pt-3 pb-2 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <span className="min-w-0">
          <span className={cn("block text-[0.9375rem]", wish.acquired && "text-muted-foreground")}>{wish.item}</span>
          <span className="mt-px block text-xs text-muted-foreground">{meta.join(" · ")}</span>
          {wish.reason && <span className="mt-1 block text-sm text-muted-foreground">{wish.reason}</span>}
        </span>
        <span className={cn("figure text-[0.9375rem]", wish.acquired && "text-muted-foreground")}>{formatMoney(total)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {!wish.acquired && (
          <Button
            variant="secondary"
            onClick={() =>
              open({
                initial: {
                  item: wish.item,
                  type: "expense",
                  amount: wish.price,
                  quantity: wish.quantity,
                  discount: wish.discount,
                  unit: wish.unit,
                },
              })
            }
            className="h-11 gap-2 px-4 text-[0.9375rem]"
          >
            <ShoppingBagIcon weight="fill" aria-hidden className="size-4" />
            Buy
          </Button>
        )}
        <label className="relative">
          <input
            type="checkbox"
            checked={wish.acquired}
            disabled={pending}
            onChange={(e) => run(() => setAcquired(wish.id, e.target.checked), e.target.checked ? `Got ${wish.item}` : `${wish.item} is back on the list`)}
            className="peer sr-only"
          />
          <span className="flex h-11 cursor-pointer items-center rounded-button px-4 text-[0.9375rem] text-muted-foreground hover:bg-accent peer-checked:bg-secondary peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
            {wish.acquired ? "Acquired" : "Mark acquired"}
          </span>
        </label>
        <span className="ml-auto -mr-3">
          <RowMenu
            label={`Actions for ${wish.item}`}
            actions={[
              { label: "Edit", onClick: onEdit },
              { label: "Delete", destructive: true, onClick: () => run(() => deleteWish(wish.id), `Deleted ${wish.item}`) },
            ]}
          />
        </span>
      </div>
      {alert && <div className="mt-2">{alert}</div>}
    </li>
  );
}

function WishForm({
  formRef,
  form,
  setForm,
  editing,
  categories,
  onDone,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  form: Form;
  setForm: React.Dispatch<React.SetStateAction<Form>>;
  editing: boolean;
  categories: string[];
  onDone: () => void;
}) {
  const { run, pending, alert, setError } = useAction();
  const uid = useId();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const price = parseAmount(form.price);
  const discount = form.discount.trim() ? parseAmount(form.discount) : 0;
  const quantity = form.quantity.trim().replace(",", ".") || "1";
  const total = price !== null && discount !== null && /^\d+(\.\d+)?$/.test(quantity) ? lineTotal({ quantity, amount: price, discount }) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (price === null) return setError("Enter a price like 250rb or 1,2jt");
    if (discount === null) return setError("Enter the discount like 25rb, or leave it empty");
    run(
      () =>
        saveWish({
          id: form.id,
          item: form.item,
          price,
          quantity,
          unit: form.unit,
          discount,
          category: form.category,
          priority: Number(form.priority) || 0,
          relativePriority: Number(form.relativePriority) || 0,
          time: form.time,
          reason: form.reason,
        }),
      editing ? `Saved ${form.item.trim()}` : `Added ${form.item.trim()}`,
      onDone,
    );
  }

  const number = (k: "priority" | "relativePriority", label: string) => (
    <label className={labelClass}>
      {label}
      <input
        value={form[k]}
        onChange={(e) => set(k, e.target.value.replace(/\D/g, "").slice(0, 3))}
        inputMode="numeric"
        placeholder="0"
        className={cn(fieldClass, "figure")}
      />
    </label>
  );

  return (
    <form ref={formRef} noValidate onSubmit={submit} className="grid scroll-mt-4 grid-cols-2 gap-x-3 gap-y-4 rounded-panel bg-panel p-4">
      <label className={cn(labelClass, "col-span-2")}>
        Item
        <input value={form.item} onChange={(e) => set("item", e.target.value)} autoComplete="off" placeholder="What you want" className={fieldClass} />
      </label>
      <label className={labelClass}>
        Price
        <input
          value={form.price}
          onChange={(e) => set("price", formatAmountInput(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Rp 0"
          className={cn(fieldClass, "figure")}
        />
      </label>

      <label className={labelClass}>
        Quantity
        <input value={form.quantity} onChange={(e) => set("quantity", e.target.value)} inputMode="decimal" className={cn(fieldClass, "figure")} />
      </label>

      {number("priority", "Priority")}
      <label className={labelClass}>
        Category
        <input value={form.category} onChange={(e) => set("category", e.target.value)} list={`${uid}-categories`} autoComplete="off" placeholder="QoL, Fashion" className={fieldClass} />
        <datalist id={`${uid}-categories`}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      <label className={cn(labelClass, "col-span-2")}>
        Why
        <input value={form.reason} onChange={(e) => set("reason", e.target.value)} autoComplete="off" placeholder="Optional" className={fieldClass} />
      </label>
      <details open={editing || undefined} className="group col-span-2">
        <summary className="-ml-3 flex h-11 w-fit cursor-pointer list-none items-center gap-1.5 rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground [&::-webkit-details-marker]:hidden">
          More details
          <CaretDownIcon weight="fill" aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-4">
          <label className={labelClass}>
            Discount
            <input
              value={form.discount}
              onChange={(e) => set("discount", formatAmountInput(e.target.value))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Rp 0"
              className={cn(fieldClass, "figure")}
            />
          </label>
          <label className={labelClass}>
            Unit
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} autoComplete="off" placeholder="pcs, pair" className={fieldClass} />
          </label>
          {number("relativePriority", "Relative priority")}
          <label className={labelClass}>
            How often
            <select value={form.time} onChange={(e) => set("time", e.target.value as Form["time"])} className={fieldClass}>
              {TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <p className="col-span-2 flex items-center justify-between text-[0.9375rem]">
        <span className="text-muted-foreground">Total</span>
        <span className="figure">{total === null ? "–" : formatMoney(total)}</span>
      </p>
      {alert && <div className="col-span-2">{alert}</div>}
      <div className="col-span-2 flex gap-2">
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {editing ? <CheckCircleIcon weight="fill" aria-hidden className="size-5" /> : <PlusCircleIcon weight="fill" aria-hidden className="size-5" />}
          {editing ? "Save" : "Add"}
        </Button>
        {editing && (
          <Button type="button" size="lg" variant="ghost" onClick={onDone} className="text-[0.9375rem] text-muted-foreground">
            Cancel
          </Button>
        )}
      </div>
      <p className="col-span-2 text-xs text-muted-foreground">Lower numbers come first. Relative priority orders wishes that share a priority.</p>
    </form>
  );
}
