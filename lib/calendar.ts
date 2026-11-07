// Dates are ISO strings ('2026-09-25') throughout, read and written in UTC so the day never shifts.
const DAY = 86_400_000;

// shortcut: fixed to Jakarta time, upgrade to a per-user zone if fintrace is ever used from elsewhere.
const jakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

/** Today's date in Jakarta. en-CA formats as YYYY-MM-DD. */
export const today = (now = new Date()) => jakarta.format(now);

export const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/** The pay day in a month, moved back to the month's last day when the month is shorter. */
function payDateIn(year: number, monthIndex: number, payDay: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(payDay, last))).toISOString().slice(0, 10);
}

/** The latest default pay date on or before `date`: where a cycle holding `date` would start. */
export function payDateOnOrBefore(date: string, payDay: number) {
  const d = new Date(`${date}T00:00:00Z`);
  const same = payDateIn(d.getUTCFullYear(), d.getUTCMonth(), payDay);
  return same <= date ? same : payDateIn(d.getUTCFullYear(), d.getUTCMonth() - 1, payDay);
}

/**
 * The next default pay date after a cycle that starts on `start`. It must be at least 15 days on,
 * so a pay day moved a few days early (a weekend) still runs to next month's pay day.
 */
export function nextPayDate(start: string, payDay: number) {
  const d = new Date(`${start}T00:00:00Z`);
  for (let month = d.getUTCMonth(); ; month++) {
    const candidate = payDateIn(d.getUTCFullYear(), month, payDay);
    if (daysBetween(start, candidate) >= 15) return candidate;
  }
}

// en-US month names: en-GB writes September as 'Sept'.
const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayMonth = (d: Date) => `${d.getUTCDate()} ${month.format(d)}`;

/** '25 Sep – 23 Oct 2026', with both years when the cycle crosses one. */
export function cycleName(start: string, end: string) {
  const [s, e] = [new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`)];
  const head = s.getUTCFullYear() === e.getUTCFullYear() ? dayMonth(s) : `${dayMonth(s)} ${s.getUTCFullYear()}`;
  return `${head} – ${dayMonth(e)} ${e.getUTCFullYear()}`;
}
