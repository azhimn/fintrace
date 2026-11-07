const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 });
const percent = new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** 'Rp 1.234.567' or '-Rp 1.234.567'. The space is a no-break space from Intl. */
export const formatMoney = (rupiah: number | bigint) => idr.format(rupiah);

/** 22.5 gives '22,5'. Postgres NUMERIC columns arrive as strings, hence the Number() cast. */
export const formatQuantity = (value: number | string) => decimal.format(Number(value));

/** 0.125 gives '12,5%'. */
export const formatPercent = (ratio: number) => percent.format(ratio);

/** A Postgres date ('2026-09-25') gives 'Fri, Sep 25'. UTC on both sides keeps the day from shifting. */
export const formatDate = (isoDate: string) => shortDate.format(new Date(`${isoDate}T00:00:00Z`));

const SUFFIXES: Record<string, number> = { rb: 1_000, k: 1_000, jt: 1_000_000 };
const AMOUNT = /^(-?)(?:rp\.?)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d+))?(rb|k|jt)?$/;

/**
 * Reads what people type into amount fields: '50rb', '50k', '1,5jt', '1.234.567', 'Rp 50.000'.
 * Returns whole rupiah, or null when the text is not an id-ID amount or lands on a fraction of a
 * rupiah. A dot only ever groups thousands, so '1.5jt' is rejected instead of guessed at.
 */
export function parseAmount(input: string): number | null {
  const match = AMOUNT.exec(input.toLowerCase().replace(/\s/g, ""));
  if (!match) return null;
  const [, sign, whole, fraction = "0", suffix] = match;
  const value = Number(`${whole.replaceAll(".", "")}.${fraction}`) * (suffix ? SUFFIXES[suffix] : 1);
  const rounded = Math.round(value);
  // The tolerance absorbs float noise: 1.1 * 1e6 is 1100000.0000000002.
  if (Math.abs(value - rounded) > 1e-6 || !Number.isSafeInteger(rounded)) return null;
  return sign && rounded !== 0 ? -rounded : rounded;
}

/**
 * Live formatting for amount fields: plain digits get id-ID thousands dots as they are typed
 * ('1500000' becomes '1.500.000'). Anything with shorthand or a comma is left as typed, since
 * parseAmount reads it either way.
 */
export function formatAmountInput(text: string) {
  if (!/^[\d.]+$/.test(text)) return text;
  const digits = text.replaceAll(".", "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const dateTime = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Jakarta",
});

/** A moment as 'Sun, Nov 8, 14:05' in Jakarta time. */
export const formatDateTime = (moment: Date) => dateTime.format(moment);
