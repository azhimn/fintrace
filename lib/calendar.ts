export type MonthSheet = {
  day: number;
  weekday: string;
  /** 0 is Sunday. */
  weekdayIndex: number;
  month: string;
  year: number;
  /** Blank cells before the 1st in a Sunday-first grid. */
  leadingBlanks: number;
  daysInMonth: number;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// shortcut: fixed to Jakarta time, upgrade to a per-user zone if fintrace is ever used from elsewhere.
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export function monthSheet(now = new Date()): MonthSheet {
  const get = (type: string) => Number(parts.formatToParts(now).find((p) => p.type === type)!.value);
  const [year, monthIndex, day] = [get("year"), get("month") - 1, get("day")];
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return {
    day,
    weekday: WEEKDAYS[weekdayIndex],
    weekdayIndex,
    month: first.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }),
    year,
    leadingBlanks: first.getUTCDay(),
    daysInMonth: new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(),
  };
}

/** Wall calendar colours: red Sundays, green Fridays, black otherwise. */
export function dayTone(weekdayIndex: number) {
  if (weekdayIndex === 0) return "text-destructive";
  if (weekdayIndex === 5) return "text-friday";
  return "text-foreground";
}
