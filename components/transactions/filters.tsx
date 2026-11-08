import { CaretDownIcon, FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import Form from "next/form";
import Link from "next/link";
import { Tip } from "@/components/ui/tip";
import type { TransactionFilters } from "@/lib/dal";
import { TYPE_LABELS, TYPES } from "@/lib/record";

type Option = { id: string; name: string };

const field =
  "h-11 w-full min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--secondary)]";
const label = "flex flex-col gap-2 text-[0.8125rem] font-medium text-muted-foreground";

/** Filters live in the URL: a plain GET form, so every view can be bookmarked and shared with yourself. */
export function Filters({
  values,
  cycleValue,
  cycles,
  funds,
  budgets,
  categories,
  tags,
}: {
  values: TransactionFilters;
  cycleValue: string;
  cycles: Option[];
  funds: Option[];
  budgets: Option[];
  categories: (Option & { subs: Option[] })[];
  tags: string[];
}) {
  const extra = values.from || values.to || values.fund || values.budget || values.category || values.sub || values.class || values.tag;
  const any = extra || values.q || values.type || values.cycle;
  return (
    <Form action="/transactions" className="rounded-panel bg-panel p-3">
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label className="relative col-span-2 sm:col-span-1">
          <span className="sr-only">Search item, location or note</span>
          <MagnifyingGlassIcon weight="fill" aria-hidden className="pointer-events-none absolute top-3.5 left-3 size-4 text-quiet-control" />
          <input name="q" type="search" defaultValue={values.q} placeholder="Search item, location, note" className={`${field} pl-9`} />
        </label>
        <label>
          <span className="sr-only">Cycle</span>
          <select name="cycle" defaultValue={cycleValue} className={field}>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="all">All cycles</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Type</span>
          <select name="type" defaultValue={values.type ?? ""} className={field}>
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <Tip label="Apply filters">
          <button type="submit" className="col-span-2 flex h-11 items-center justify-center rounded-button bg-foreground text-window hover:bg-[color-mix(in_oklch,var(--foreground),var(--kraft-ink)_40%)] sm:col-span-1 sm:w-11">
            <FunnelIcon weight="fill" aria-hidden className="size-5" />
            {/* Full width on a phone, so it has room for its name; a 44px square from sm up. */}
            <span className="ml-2 text-[0.9375rem] font-medium sm:hidden">Apply</span>
          </button>
        </Tip>
      </div>

      <details open={!!extra} className="disclosure group mt-1">
        <summary className="-mx-1 flex h-11 cursor-pointer list-none items-center gap-2 rounded-button px-1 text-[0.9375rem] [&::-webkit-details-marker]:hidden">
          More filters
          <CaretDownIcon weight="fill" aria-hidden className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180" />
          {any && (
            <Link href="/transactions?" className="ml-auto flex h-11 items-center rounded-button px-3 text-muted-foreground hover:bg-accent hover:text-foreground">
              Clear all
            </Link>
          )}
        </summary>
        <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-1 pb-1 sm:grid-cols-4">
          <label className={label}>
            From
            <input name="from" type="date" defaultValue={values.from} className={field} />
          </label>
          <label className={label}>
            To
            <input name="to" type="date" defaultValue={values.to} className={field} />
          </label>
          <Select name="fund" label="Fund" value={values.fund} all="Any Fund" options={funds} />
          <Select name="budget" label="Budget" value={values.budget} all="Any Budget" options={budgets} />
          <Select name="category" label="Category" value={values.category} all="Any category" options={categories} />
          <label className={label}>
            Subcategory
            <select name="sub" defaultValue={values.sub ?? ""} className={field}>
              <option value="">Any subcategory</option>
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
          </label>
          <label className={label}>
            Needs or Wants
            <select name="class" defaultValue={values.class ?? ""} className={field}>
              <option value="">Either</option>
              <option value="needs">Needs</option>
              <option value="wants">Wants</option>
              <option value="none">Unclassified</option>
            </select>
          </label>
          <Select name="tag" label="Tag" value={values.tag} all="Any tag" options={tags.map((t) => ({ id: t, name: t }))} />
        </div>
      </details>
    </Form>
  );
}

function Select({ name, label: text, value, all, options }: { name: string; label: string; value?: string; all: string; options: Option[] }) {
  return (
    <label className={label}>
      {text}
      <select name={name} defaultValue={value ?? ""} className={field}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
