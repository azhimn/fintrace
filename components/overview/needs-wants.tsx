import type { needsVsWants } from "@/lib/finance";
import { formatMoney, formatPercent } from "@/lib/format";

const GROUPS = [
  { key: "needs", label: "Needs", color: "var(--secondary)" },
  { key: "wants", label: "Wants", color: "#8e9be0" },
  { key: null, label: "Unclassified", color: "#c8c2bb" },
] as const;

const R = 42;
const C = 2 * Math.PI * R;

/** This cycle's spending split as a donut, with the amounts beside it so colour is never the only key. */
export function NeedsWants({ split }: { split: ReturnType<typeof needsVsWants> }) {
  const groups = GROUPS.map((g) => ({ ...g, spent: split.find((s) => s.classification === g.key)?.total.spent ?? 0 })).filter(
    (g) => g.spent > 0,
  );
  const sum = groups.reduce((s, g) => s + g.spent, 0);
  if (sum === 0) {
    return (
      <p className="rounded-panel bg-panel px-4 py-4 text-[0.9375rem] text-muted-foreground">
        No spending recorded this cycle yet.
      </p>
    );
  }
  const unsorted = groups.every((g) => g.key === null);
  const starts = groups.map((_, i) => groups.slice(0, i).reduce((s, g) => s + (g.spent / sum) * C, 0));
  return (
    <div className="flex items-center gap-5 rounded-panel bg-panel px-4 py-4">
      <svg
        viewBox="0 0 112 112"
        role="img"
        aria-label={groups.map((g) => `${g.label} ${formatPercent(g.spent / sum)}`).join(", ")}
        className="size-28 shrink-0 -rotate-90"
      >
        <circle cx="56" cy="56" r={R} fill="none" stroke="var(--track)" strokeWidth="16" />
        {groups.map((g, i) => {
          const length = (g.spent / sum) * C;
          return (
            <circle
              key={g.label}
              cx="56"
              cy="56"
              r={R}
              fill="none"
              stroke={g.color}
              strokeWidth="16"
              strokeDasharray={`${length} ${C - length}`}
              strokeDashoffset={-starts[i]}
            />
          );
        })}
      </svg>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
      <dl className="flex flex-col gap-2 text-[0.9375rem]">
        {groups.map((g) => (
          <div key={g.label} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: g.color }} />
              {g.label}
            </dt>
            <dd className="text-right">
              <span className="figure">{formatMoney(g.spent)}</span>
              <span className="block text-xs text-muted-foreground">{formatPercent(g.spent / sum)}</span>
            </dd>
          </div>
        ))}
      </dl>
      {unsorted && (
        <p className="text-sm text-muted-foreground">
          Choose a category under More when you record, and spending sorts into Needs and Wants.
        </p>
      )}
      </div>
    </div>
  );
}
