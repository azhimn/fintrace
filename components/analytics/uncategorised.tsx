"use client";

import { useRecord } from "@/components/record/record-provider";
import { Money } from "@/components/shell/bits";
import type { RecordInput } from "@/lib/record";

/** Spending with no category, each with a Categorise button that opens it with the category field showing. */
export function Uncategorised({ rows, editable }: { rows: { input: RecordInput; total: number; meta: string }[]; editable: boolean }) {
  const { open } = useRecord();
  return (
    <ul className="rounded-panel bg-panel">
      {rows.map((row) => (
        <li key={row.input.id} className="flex items-center justify-between gap-3 border-t border-divider py-1.5 pr-2 pl-4 first:border-t-0">
          <span className="min-w-0 py-1.5">
            <span className="block truncate text-[0.9375rem]">{row.input.item}</span>
            <span className="mt-px block truncate text-xs text-muted-foreground">{row.meta}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Money value={row.total} className="text-[0.9375rem]" />
            {editable && (
              <button
                type="button"
                onClick={() => open({ initial: row.input, mode: "edit", more: true })}
                className="h-11 rounded-button px-3 text-[0.9375rem] text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Categorise
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
