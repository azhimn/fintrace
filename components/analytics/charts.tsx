"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatMoney } from "@/lib/format";

const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const compact = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Axis money: 50rb, 1,2jt. */
const shortMoney = (n: number) =>
  n >= 1_000_000 ? `${compact.format(n / 1_000_000)}jt` : n >= 1_000 ? `${compact.format(n / 1_000)}rb` : String(n);

/** Expense per category as horizontal bars, each labelled with its amount so the bar is never the only key. */
export function CategoryBars({ rows }: { rows: { name: string; total: number }[] }) {
  return (
    <BarChart
      layout="vertical"
      data={rows}
      responsive
      style={{ width: "100%", height: rows.length * 40 + 8 }}
      margin={{ top: 4, right: 96, bottom: 4, left: 0 }}
      accessibilityLayer
    >
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="name" width={150} tick={tick} tickLine={false} axisLine={false} interval={0} />
      <Bar dataKey="total" name="Spent" fill="var(--secondary)" radius={8} barSize={20} isAnimationActive={false}>
        <LabelList
          dataKey="total"
          position="right"
          formatter={(v) => formatMoney(Number(v))}
          style={{ fill: "var(--foreground)", fontSize: 13, fontWeight: 500 }}
        />
      </Bar>
    </BarChart>
  );
}

type Day = { day: number; date: string; total?: number; previous?: number };

/** Expense per day of this cycle, with the previous cycle's same day dashed behind it. */
export function DailyLine({ days, previousName }: { days: Day[]; previousName: string | null }) {
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted-foreground">
        <li className="flex items-center gap-2">
          <svg aria-hidden width="20" height="4">
            <line x1="0" y1="2" x2="20" y2="2" stroke="var(--chart-line)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          This cycle
        </li>
        {previousName && (
          <li className="flex items-center gap-2">
            <svg aria-hidden width="20" height="4">
              <line x1="0" y1="2" x2="20" y2="2" stroke="var(--quiet-control)" strokeWidth="2" strokeDasharray="4 3" />
            </svg>
            {previousName}
          </li>
        )}
      </ul>
      <LineChart
        data={days}
        responsive
        style={{ width: "100%", height: 220 }}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} stroke="var(--divider)" />
        <XAxis
          dataKey="date"
          tick={tick}
          tickLine={false}
          axisLine={false}
          tickFormatter={(d: string) => formatDate(d).slice(5)}
          minTickGap={24}
        />
        <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={shortMoney} width={48} />
        <Tooltip
          cursor={{ stroke: "var(--track)" }}
          content={({ active, payload }) => {
            const d = payload?.[0]?.payload as Day | undefined;
            if (!active || !d) return null;
            return (
              <div className="rounded-panel bg-panel px-3 py-2 text-[0.8125rem] shadow-[0_8px_24px_-8px_rgb(61_56_50/0.3)]">
                <p className="text-muted-foreground">
                  {formatDate(d.date)} · day {d.day}
                </p>
                <p className="figure">{d.total === undefined ? "Not yet" : formatMoney(d.total)}</p>
                {d.previous !== undefined && (
                  <p className="text-muted-foreground">
                    Last cycle <span className="figure">{formatMoney(d.previous)}</span>
                  </p>
                )}
              </div>
            );
          }}
        />
        {previousName && (
          <Line
            dataKey="previous"
            name={previousName}
            stroke="var(--quiet-control)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        )}
        <Line
          dataKey="total"
          name="This cycle"
          stroke="var(--chart-line)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "var(--chart-line)", stroke: "var(--panel)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
