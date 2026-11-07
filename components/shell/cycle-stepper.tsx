import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { daysBetween } from "@/lib/calendar";

type Cycle = { id: string; name: string; startDate: string; endDate: string; status: "open" | "closed" };

/** The cycle a screen shows: the one asked for, else the one holding today, else the latest. */
export function pickCycle<C extends Cycle>(cycles: C[], requested: string | string[] | undefined, date: string) {
  return (
    cycles.find((c) => c.id === requested) ??
    cycles.find((c) => c.startDate <= date && c.endDate >= date) ??
    cycles[0]
  );
}

/** Steps through cycles on a screen's band. `cycles` come newest first, as the DAL returns them. */
export function CycleStepper({ cycles, cycle, path, date }: { cycles: Cycle[]; cycle: Cycle; path: string; date: string }) {
  const i = cycles.findIndex((c) => c.id === cycle.id);
  const older = cycles[i + 1];
  const newer = cycles[i - 1];
  const left = daysBetween(date, cycle.endDate);
  const status =
    cycle.status === "closed"
      ? "Closed"
      : cycle.startDate > date
        ? "Not started"
        : left < 0
          ? "Ended, still open"
          : left === 0
            ? "Last day"
            : `${left} ${left === 1 ? "day" : "days"} left`;
  const step = "flex size-11 shrink-0 items-center justify-center rounded-button text-kraft-ink hover:bg-kraft-ink/10 hover:text-foreground";
  return (
    <div className="mt-2 -ml-3 flex items-center gap-1">
      {older ? (
        <Link href={`${path}?cycle=${older.id}`} aria-label={`Previous cycle, ${older.name}`} className={step}>
          <CaretLeftIcon weight="fill" className="size-4" />
        </Link>
      ) : (
        <span className="size-11" />
      )}
      <p className="min-w-0 text-[0.8125rem]">
        <span className="font-medium">{cycle.name}</span>
        <span className="text-kraft-ink"> · {status}</span>
      </p>
      {newer && (
        <Link href={`${path}?cycle=${newer.id}`} aria-label={`Next cycle, ${newer.name}`} className={step}>
          <CaretRightIcon weight="fill" className="size-4" />
        </Link>
      )}
    </div>
  );
}
