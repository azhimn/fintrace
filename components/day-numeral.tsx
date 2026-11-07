import { dayTone, type MonthSheet } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export function DayNumeral({ sheet, large, className }: { sheet: MonthSheet; large?: boolean; className?: string }) {
  return (
    <p className={cn("flex items-end gap-3", className)}>
      <span className={cn("numeral", large ? "text-8xl" : "text-7xl", dayTone(sheet.weekdayIndex))}>{sheet.day}</span>
      <span className={cn("pb-1 leading-tight", large ? "text-lg" : "text-sm")}>
        <span className="block font-semibold">{sheet.weekday}</span>
        <span className="block text-muted-foreground">
          {sheet.month} {sheet.year}
        </span>
      </span>
    </p>
  );
}
