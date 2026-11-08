import { AddressWindow, Band } from "@/components/shell/band";
import { cn } from "@/lib/utils";

// Placeholder text lines at the real type sizes, so the skeleton window is as tall as a loaded one.
const bar = "inline-block h-[0.7em] rounded-full bg-track/70 align-middle";

// The real band, so the tabs stay put while the next screen loads.
export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <Band>
        <p className="mt-3 text-[0.8125rem]">
          <span className={cn(bar, "w-40 bg-kraft-ink/15")} />
        </p>
        <AddressWindow label="Loading" className="mt-2 animate-pulse">
          <p className="text-[0.8125rem]">
            <span className={cn(bar, "w-28")} />
          </p>
          <p className="mt-0.5 text-[2.125rem] leading-tight">
            <span className={cn(bar, "w-48")} />
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-3 text-[0.8125rem]">
            {[0, 1].map((i) => (
              <div key={i}>
                <dt>
                  <span className={cn(bar, "w-20")} />
                </dt>
                <dd>
                  <span className={cn(bar, "w-14")} />
                </dd>
              </div>
            ))}
          </dl>
        </AddressWindow>
      </Band>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-5 pt-[22px] lg:px-8">
        <div className="h-15 rounded-button bg-foreground/15 lg:hidden" />
        <div className="h-48 animate-pulse rounded-panel bg-panel" />
        <div className="h-40 animate-pulse rounded-panel bg-panel" />
      </main>
    </div>
  );
}
