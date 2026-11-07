"use client";

import { RepeatIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useRecord } from "@/components/record/record-provider";
import { today } from "@/lib/calendar";
import { formatMoney } from "@/lib/format";
import type { RecordInput } from "@/lib/record";

type Row = { input: RecordInput; total: number; meta: string; hue: string };

const SWIPE = 72;

/** The latest records: tap one to edit it, swipe it left (or use its repeat button) to record it again. */
export function RecentList({ rows }: { rows: Row[] }) {
  const { open } = useRecord();
  const duplicate = (input: RecordInput) =>
    open({ initial: { ...input, id: crypto.randomUUID(), date: today(), planItemId: null } });

  return (
    <ul className="overflow-hidden rounded-panel bg-panel">
      {rows.map((row) => (
        <SwipeRow key={row.input.id} row={row} onEdit={() => open({ initial: row.input, mode: "edit" })} onDuplicate={() => duplicate(row.input)} />
      ))}
    </ul>
  );
}

function SwipeRow({ row, onEdit, onDuplicate }: { row: Row; onEdit: () => void; onDuplicate: () => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  return (
    <li className="relative border-t border-divider first:border-t-0">
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 flex items-center gap-2 bg-secondary pr-4 pl-6 text-sm font-medium"
        style={{ opacity: Math.min(-dx / SWIPE, 1) }}
      >
        <RepeatIcon weight="fill" className="size-4" /> Record again
      </span>
      <div
        className="relative flex touch-pan-y items-center bg-panel transition-transform duration-200 ease-out data-dragging:transition-none"
        data-dragging={dragging || undefined}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          start.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const x = e.clientX - start.current.x;
          if (Math.abs(e.clientY - start.current.y) > Math.abs(x) && !swiped.current) return;
          if (x < -8) swiped.current = true;
          setDx(Math.max(Math.min(x, 0), -SWIPE * 1.5));
        }}
        onPointerUp={() => {
          if (start.current && dx <= -SWIPE) onDuplicate();
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <button
          type="button"
          onClick={() => !swiped.current && onEdit()}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-panel py-3 pl-4 text-left"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: row.hue }} />
            <span className="min-w-0">
              <span className="block truncate text-[0.9375rem]">{row.input.item}</span>
              <span className="mt-px block truncate text-xs text-muted-foreground">{row.meta}</span>
            </span>
          </span>
          <span className="figure text-[0.9375rem]">
            {row.input.type === "income" ? "+" : ""}
            {formatMoney(row.total)}
          </span>
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={`Record ${row.input.item} again`}
          className="mx-1 flex size-11 shrink-0 items-center justify-center rounded-button text-[#85807a] hover:bg-accent hover:text-foreground"
        >
          <RepeatIcon weight="fill" className="size-[1.125rem]" />
        </button>
      </div>
    </li>
  );
}
