"use client";

import { ArrowDownLeftIcon, ArrowsLeftRightIcon, ArrowUpRightIcon, DotsThreeIcon, PiggyBankIcon } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { deleteRecord, saveRecord } from "@/app/(app)/actions";
import { useRecord } from "@/components/record/record-provider";
import { toasts } from "@/components/record/toast";
import { HueDot } from "@/components/shell/bits";
import { today } from "@/lib/calendar";
import { formatMoney } from "@/lib/format";
import { TYPE_LABELS, type RecordInput, type RecordType } from "@/lib/record";
import { cn } from "@/lib/utils";

export type TransactionRow = {
  input: RecordInput;
  isOpening: boolean;
  closed: boolean;
  total: number;
  date: string;
  funds: string;
  budget: { name: string; hue: string } | null;
  category: string | null;
  detail: string;
};

/** Each record type's badge: money out apricot ↗, in mint ↙, moved between Funds sky ⇄, saved lilac. */
const TYPE_BADGE = {
  expense: { Icon: ArrowUpRightIcon, hue: "var(--hue-apricot)" },
  income: { Icon: ArrowDownLeftIcon, hue: "var(--hue-mint)" },
  transfer: { Icon: ArrowsLeftRightIcon, hue: "var(--hue-sky)" },
  saving: { Icon: PiggyBankIcon, hue: "var(--hue-lilac)" },
} satisfies Record<RecordType, unknown>;

function TypeBadge({ type }: { type: RecordType }) {
  const { Icon, hue } = TYPE_BADGE[type];
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-foreground" style={{ background: hue }}>
      <Icon weight="fill" aria-hidden className="size-4" />
      <span className="sr-only">{TYPE_LABELS[type]}</span>
    </span>
  );
}

/** The Transactions table on a desktop and a list on a phone. Tap a row to edit it; ⋯ holds the rest. */
export function TransactionList({ rows }: { rows: TransactionRow[] }) {
  const { open } = useRecord();

  const actions = {
    edit: (row: TransactionRow) => open({ initial: row.input, mode: "edit" }),
    duplicate: (row: TransactionRow) => open({ initial: { ...row.input, id: crypto.randomUUID(), date: today(), planItemId: null } }),
    async remove(row: TransactionRow) {
      const removed = await deleteRecord(row.input.id);
      if (!removed) return toasts.add({ title: "Couldn't delete that", description: "Its cycle may be closed.", timeout: 5000 });
      const id = toasts.add({
        title: `Deleted ${row.input.item}`,
        timeout: 6000,
        actionProps: {
          children: "Undo",
          async onClick() {
            toasts.close(id);
            const result = await saveRecord(row.input);
            toasts.add({ title: result.ok ? `${row.input.item} is back` : "Couldn't undo that", timeout: 3000 });
          },
        },
      });
    },
  };
  // Opening rows and closed cycles are read-only: only Record again applies.
  const editable = (row: TransactionRow) => !row.isOpening && !row.closed;
  const amount = (row: TransactionRow) => (
    <span className={cn("figure", row.total < 0 && "text-destructive", row.input.type === "transfer" && "text-muted-foreground")}>
      {row.input.type === "income" && row.total > 0 ? "+" : ""}
      {formatMoney(row.total)}
    </span>
  );

  return (
    <>
      <ul className="overflow-hidden rounded-panel bg-panel lg:hidden">
        {rows.map((row) => (
          <li key={row.input.id} className="flex items-center border-t border-divider first:border-t-0">
            <button
              type="button"
              disabled={!editable(row)}
              onClick={() => actions.edit(row)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-panel py-3 pl-4 text-left disabled:cursor-default"
            >
              <span className="flex min-w-0 items-center gap-3">
                <TypeBadge type={row.input.type} />
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem]">{row.input.item}</span>
                  <span className="mt-px block truncate text-xs text-muted-foreground">
                    {[row.date, row.funds, row.input.type === "transfer" ? row.budget?.name : row.category].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              <span className="text-[0.9375rem]">{amount(row)}</span>
            </button>
            <RowMenu row={row} editable={editable(row)} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-panel bg-panel lg:block">
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="text-[0.8125rem] text-muted-foreground">
            <tr>
              <th scope="col" className="py-2.5 pl-4 font-medium">Date</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Item</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Funds</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Budget</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
              <th scope="col" className="w-14"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.input.id}
                onClick={(e) => {
                  // React bubbles clicks from the portalled menu here too; only plain cell clicks edit.
                  const target = e.target as HTMLElement;
                  if (editable(row) && e.currentTarget.contains(target) && !target.closest("button")) actions.edit(row);
                }}
                className={cn("border-t border-divider align-middle", editable(row) && "cursor-pointer hover:bg-accent")}
              >
                <td className="py-2.5 pl-4 whitespace-nowrap text-muted-foreground">{row.date}</td>
                <td className="max-w-72 px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <TypeBadge type={row.input.type} />
                    <span className="min-w-0">
                      {editable(row) ? (
                        <button type="button" onClick={() => actions.edit(row)} className="block max-w-full truncate rounded-sm text-left">
                          {row.input.item}
                        </button>
                      ) : (
                        <span className="block truncate">{row.input.item}</span>
                      )}
                      {row.detail && <span className="block truncate text-xs text-muted-foreground">{row.detail}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{row.funds}</td>
                <td className="px-3 py-2.5">
                  {row.budget && (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <HueDot hue={row.budget.hue} />
                      {row.budget.name}
                    </span>
                  )}
                </td>
                <td className="max-w-48 truncate px-3 py-2.5 text-muted-foreground">{row.category ?? "Uncategorised"}</td>
                <td className="px-3 py-2.5 text-right">{amount(row)}</td>
                <td className="pr-1">
                  <RowMenu row={row} editable={editable(row)} actions={actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type Actions = Record<"edit" | "duplicate" | "remove", (row: TransactionRow) => unknown>;

function RowMenu({ row, editable, actions }: { row: TransactionRow; editable: boolean; actions: Actions }) {
  if (row.isOpening) return <span className="mx-1 block size-11 shrink-0" />;
  const item =
    "flex h-11 cursor-default items-center rounded-field px-3 text-[0.9375rem] outline-none select-none data-highlighted:bg-field";
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Actions for ${row.input.item}`}
        className="mx-1 flex size-11 shrink-0 items-center justify-center rounded-button text-quiet-control hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
      >
        <DotsThreeIcon weight="fill" className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-50">
          <Menu.Popup className="min-w-44 rounded-panel bg-panel p-1 shadow-[0_8px_24px_-8px_rgb(61_56_50/0.3)] outline-none">
            {editable && (
              <Menu.Item onClick={() => actions.edit(row)} className={item}>
                Edit
              </Menu.Item>
            )}
            <Menu.Item onClick={() => actions.duplicate(row)} className={item}>
              Record again
            </Menu.Item>
            {editable && (
              <Menu.Item onClick={() => actions.remove(row)} className={cn(item, "text-destructive")}>
                Delete
              </Menu.Item>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
