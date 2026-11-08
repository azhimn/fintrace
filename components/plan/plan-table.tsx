"use client";

import { DotsThreeIcon, ListPlusIcon } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { useState } from "react";
import { copyPreviousPlan, deletePlanItem, savePlanItem } from "@/app/(app)/actions";
import type { PlanInput } from "@/components/record/record-form";
import { useRecord } from "@/components/record/record-provider";
import { toasts } from "@/components/record/toast";
import { Empty, HueDot } from "@/components/shell/bits";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tip";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PlanRow = {
  input: PlanInput & { id: string; item: string };
  meta: string;
  budget: { name: string; hue: string } | null;
  planned: number;
  actual: number;
  variance: number;
  expected: number;
  spends: boolean;
};

type Cycle = { id: string; startDate: string; endDate: string; closed: boolean; hasPrevious: boolean };

const Figure = ({ value, muted }: { value: number; muted?: boolean }) => (
  <span className={cn("figure", value < 0 ? "text-destructive" : muted && "text-muted-foreground")}>{formatMoney(value)}</span>
);

/** The cycle's plan with running Expected Funds and plan vs actual. Rows record, edit and delete from ⋯. */
export function PlanTable({ rows, cycle, recordDate }: { rows: PlanRow[]; cycle: Cycle; recordDate: string }) {
  const { open } = useRecord();
  const [copying, setCopying] = useState(false);
  const plan = { cycleId: cycle.id, cycleStart: cycle.startDate };

  const actions = {
    record: (row: PlanRow) =>
      open({ initial: { ...row.input, id: crypto.randomUUID(), date: recordDate, planItemId: row.input.id, frequency: undefined } }),
    edit: (row: PlanRow) => open({ initial: row.input, mode: "edit", plan }),
    async remove(row: PlanRow) {
      const removed = await deletePlanItem(row.input.id);
      if (!removed) return toasts.add({ title: "Couldn't delete that", description: "The cycle may be closed.", timeout: 5000 });
      const id = toasts.add({
        title: `Deleted ${row.input.item} from the plan`,
        timeout: 6000,
        actionProps: {
          children: "Undo",
          async onClick() {
            toasts.close(id);
            const result = await savePlanItem(cycle.id, { ...row.input, sortNo: removed.sortNo });
            toasts.add({ title: result.ok ? `${row.input.item} is back` : "Couldn't undo that", timeout: 3000 });
          },
        },
      });
    },
  };

  async function copy() {
    setCopying(true);
    try {
      const error = await copyPreviousPlan(cycle.id);
      toasts.add({ title: error ?? "Copied the last cycle's plan", timeout: 4000 });
    } finally {
      setCopying(false);
    }
  }

  const tools = !cycle.closed && (
    <div className="flex flex-wrap gap-2">
      <Tip label="Add item">
        <Button size="lg" onClick={() => open({ plan })} className="size-11 px-0">
          <ListPlusIcon weight="fill" aria-hidden className="size-5" />
        </Button>
      </Tip>
      {cycle.hasPrevious && (
        <Button size="lg" variant="outline" disabled={copying} onClick={copy} className="h-11 text-[0.9375rem]">
          Copy from previous cycle
        </Button>
      )}
    </div>
  );

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <Empty>
          {cycle.closed
            ? "This cycle had no plan."
            : "No plan for this cycle yet. Add your salary and the bills you expect, or copy the last cycle's plan and adjust it."}
        </Empty>
        {tools}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="overflow-hidden rounded-panel bg-panel lg:hidden">
        {rows.map((row) => (
          <li key={row.input.id} className="flex items-center border-t border-divider first:border-t-0">
            <button
              type="button"
              disabled={cycle.closed}
              onClick={() => actions.edit(row)}
              className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-panel py-3 pl-4 text-left disabled:cursor-default"
            >
              <span className="flex min-w-0 items-start gap-2.5">
                <span className="mt-1.5">
                  <HueDot hue={row.budget?.hue ?? "var(--track)"} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem]">{row.input.item}</span>
                  <span className="mt-px block truncate text-xs text-muted-foreground">{row.meta}</span>
                  {row.spends && (
                    <span className={cn("mt-px block text-xs", row.variance < 0 ? "text-destructive" : "text-muted-foreground")}>
                      {formatMoney(row.actual)} of {formatMoney(row.planned)} used
                    </span>
                  )}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[0.9375rem]">
                  <Figure value={row.planned} />
                </span>
                <span className="mt-px block text-xs whitespace-nowrap text-muted-foreground">
                  Funds after <Figure value={row.expected} muted />
                </span>
              </span>
            </button>
            <RowMenu row={row} closed={cycle.closed} actions={actions} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-panel bg-panel lg:block">
        <table className="w-full text-left text-[0.9375rem]">
          <thead className="text-[0.8125rem] text-muted-foreground">
            <tr>
              <th scope="col" className="py-2.5 pl-4 font-medium">Item</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Budget</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Planned</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Actual</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Left</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Expected Funds</th>
              <th scope="col" className="w-14"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.input.id} className="border-t border-divider">
                <td className="max-w-72 py-2.5 pl-4">
                  <span className="block truncate">{row.input.item}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.meta}</span>
                </td>
                <td className="px-3 py-2.5">
                  {row.budget && (
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <HueDot hue={row.budget.hue} />
                      {row.budget.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Figure value={row.planned} />
                </td>
                <td className="px-3 py-2.5 text-right">{row.spends || row.actual ? <Figure value={row.actual} muted /> : null}</td>
                <td className="px-3 py-2.5 text-right">
                  {row.spends && <Figure value={row.variance} muted />}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Figure value={row.expected} />
                </td>
                <td className="pr-1">
                  <RowMenu row={row} closed={cycle.closed} actions={actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tools}
    </div>
  );
}

type Actions = Record<"record" | "edit" | "remove", (row: PlanRow) => unknown>;

function RowMenu({ row, closed, actions }: { row: PlanRow; closed: boolean; actions: Actions }) {
  if (closed) return <span className="mx-1 block size-11 shrink-0" />;
  const item = "flex h-11 cursor-default items-center rounded-field px-3 text-[0.9375rem] outline-none select-none data-highlighted:bg-field";
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
            <Menu.Item onClick={() => actions.record(row)} className={item}>
              Record it
            </Menu.Item>
            <Menu.Item onClick={() => actions.edit(row)} className={item}>
              Edit
            </Menu.Item>
            <Menu.Item onClick={() => actions.remove(row)} className={cn(item, "text-destructive")}>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
