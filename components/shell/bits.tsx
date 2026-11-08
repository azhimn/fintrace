import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Money = ({ value, signed, className }: { value: number; signed?: boolean; className?: string }) => (
  <span className={cn("figure", value < 0 && "text-destructive", className)}>
    {signed && value > 0 ? "+" : ""}
    {formatMoney(value)}
  </span>
);

export function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mt-[22px]", className)}>
      {/* 8px under a heading; 12px when it carries a button, so the button doesn't crowd the panel. */}
      <div className={cn("mb-2 flex min-h-6 items-end justify-between gap-3", action && "mb-3")}>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-panel bg-panel px-4 py-4 text-[0.9375rem] text-muted-foreground">{children}</div>;
}

export const HueDot = ({ hue }: { hue: string }) => (
  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: hue }} />
);
