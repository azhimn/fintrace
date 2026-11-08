import { ViewTransition } from "react";
import { cn } from "@/lib/utils";
import { Nav } from "./nav";

/**
 * The kraft pay envelope across the top of every app screen: the section tabs, then whatever the
 * screen frames in its address window, then the wavy flap.
 */
export function Band({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* Named, so the band, its flap and its window resize and move smoothly between the loading
          skeleton and the screen, and between screens. Same-screen refreshes don't animate. */}
      <ViewTransition name="band" share="auto" default="none">
        <header className="bg-kraft">
          <div className="mx-auto max-w-5xl px-5 pt-3 pb-5 lg:px-8 lg:pt-4">
            <Nav />
            {children}
          </div>
        </header>
      </ViewTransition>
      <ViewTransition name="flap" share="auto" default="none">
        <div className="flap" aria-hidden />
      </ViewTransition>
    </>
  );
}

/**
 * The die-cut white window in the band that frames a screen's key figure. Children are a label,
 * the figure, then the supporting line or pairs, which move to the right on a desktop.
 */
export function AddressWindow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <ViewTransition name="window" share="auto" default="none">
      <section
        aria-label={label}
        className={cn(
          "mt-3 rounded-panel bg-window px-4 pt-3.5 pb-4",
          "lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-8 lg:[&>dl]:gap-x-12",
          "lg:[&>:nth-child(3)]:col-start-2 lg:[&>:nth-child(3)]:row-span-2 lg:[&>:nth-child(3)]:row-start-1 lg:[&>:nth-child(3)]:mt-0 lg:[&>:nth-child(3)]:mb-1",
          className,
        )}
      >
        {children}
      </section>
    </ViewTransition>
  );
}
