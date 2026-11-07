import { dayTone, type MonthSheet } from "@/lib/calendar";
import { cn } from "@/lib/utils";

const HEADINGS = [
  ["S", "Sunday"],
  ["M", "Monday"],
  ["T", "Tuesday"],
  ["W", "Wednesday"],
  ["T", "Thursday"],
  ["F", "Friday"],
  ["S", "Saturday"],
];

export function MonthGrid({ sheet }: { sheet: MonthSheet }) {
  const cells = sheet.leadingBlanks + sheet.daysInMonth;
  const trailingBlanks = (7 - (cells % 7)) % 7;
  const weeks = (cells + trailingBlanks) / 7;

  return (
    <div
      role="img"
      aria-label={`Calendar for ${sheet.month} ${sheet.year}, today is ${sheet.weekday} the ${sheet.day}`}
      style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(0, 1fr))` }}
      className="grid flex-1 grid-cols-7 border-t border-l border-border"
    >
      {HEADINGS.map(([letter, name], i) => (
        <div
          key={name}
          className={cn("border-r border-b border-border px-3 py-2 text-xs font-semibold", dayTone(i))}
        >
          {letter}
        </div>
      ))}
      {Array.from({ length: sheet.leadingBlanks }, (_, i) => (
        <div key={i} className="border-r border-b border-border bg-muted" />
      ))}
      {Array.from({ length: sheet.daysInMonth }, (_, i) => {
        const day = i + 1;
        const isToday = day === sheet.day;
        return (
          <div
            key={day}
            className={cn(
              "numeral border-r border-b border-border px-3 py-3 text-3xl",
              isToday ? "bg-primary text-primary-foreground" : dayTone((sheet.leadingBlanks + i) % 7),
            )}
          >
            {day}
          </div>
        );
      })}
      {Array.from({ length: trailingBlanks }, (_, i) => (
        <div key={i} className="border-r border-b border-border bg-muted" />
      ))}
    </div>
  );
}
