import type { Metadata } from "next";
import { CloseCycle, StartDateEditor, StartFirstCycle } from "@/components/cycles/cycle-actions";
import { RecordBar } from "@/components/overview/record-bar";
import { AddressWindow, Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { addDays, daysBetween, nextPayDate, payDateOnOrBefore, today } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { getDal } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cycles" };

export default async function CyclesPage() {
  const dal = await getDal();
  const date = today();
  const [cycles, settings] = await Promise.all([dal.cycles(), dal.settings()]);
  const payDay = settings?.defaultPayDay ?? 25;
  // Cycles close in order, so only the oldest open one offers Close.
  const closable = cycles.findLast((c) => c.status === "open");
  const after = closable && cycles[cycles.indexOf(closable) - 1];
  const current = cycles.find((c) => c.startDate <= date && c.endDate >= date);
  // With today outside every cycle, frame the one waiting to be closed, else the latest.
  const framed = current ?? closable ?? cycles[0];
  const left = framed ? daysBetween(date, framed.endDate) : 0;

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Cycles</h1>
        {framed && (
          <AddressWindow label={framed === current ? "Current cycle" : "Latest cycle"} className="mt-2">
            <p className="text-[0.8125rem] font-medium text-kraft-ink">{framed === current ? "Current cycle" : "Latest cycle"}</p>
            <p className="mt-0.5 text-[1.75rem] leading-tight font-semibold tracking-[-0.01em]">{framed.name}</p>
            <p className="mt-2 text-[0.8125rem] text-kraft-ink">
              {framed.status === "closed"
                ? "Closed"
                : left < 0
                  ? `Ended ${formatDate(framed.endDate)} and still open. Close it to carry the balances over.`
                  : `${left === 0 ? "Last day" : `${left} ${left === 1 ? "day" : "days"} left`} · next pay day ${formatDate(addDays(framed.endDate, 1))}`}
            </p>
          </AddressWindow>
        )}
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Section title="All cycles">
            {cycles.length === 0 ? (
              <StartFirstCycle suggested={payDateOnOrBefore(date, payDay)} />
            ) : (
              <ul className="rounded-panel bg-panel">
                {cycles.map((c) => (
                  <li key={c.id} className="border-t border-divider px-4 py-3 first:border-t-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem]">{c.name}</span>
                        <span className="mt-px block text-xs text-muted-foreground">
                          {formatDate(c.startDate)} to {formatDate(c.endDate)} · {daysBetween(c.startDate, c.endDate) + 1} days
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-0.5 text-xs",
                          c.status === "open" ? "bg-secondary text-foreground" : "bg-track text-muted-foreground",
                        )}
                      >
                        {c.status === "open" ? (c === current ? "Current" : "Open") : "Closed"}
                      </span>
                    </div>
                    {c.status === "open" && (
                      <div className="mt-3">
                        <StartDateEditor key={c.startDate} cycleId={c.id} start={c.startDate} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {closable && (
            <Section title={`Close ${closable.name}`}>
              <CloseCycle
                key={closable.id}
                cycleId={closable.id}
                name={closable.name}
                suggested={after ? after.startDate : nextPayDate(closable.startDate, payDay)}
                fixed={!!after}
              />
            </Section>
          )}
        </div>
      </main>
    </>
  );
}
