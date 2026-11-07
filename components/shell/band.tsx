import Link from "next/link";
import { RecordBar } from "@/components/overview/record-bar";
import { cn } from "@/lib/utils";
import { Nav } from "./nav";

/**
 * The kraft pay envelope across the top of every app screen: wordmark, section tabs and (on a
 * desktop) Record, then whatever the screen frames in its address window, then the wavy flap.
 */
export function Band({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <header className="bg-kraft">
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-5 lg:px-8 lg:pt-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/" className="-ml-1 flex h-11 items-center rounded-button px-1 text-base font-semibold">
              fintrace
            </Link>
            <Nav />
            <span className="ml-auto">
              <RecordBar placement="band" />
            </span>
          </div>
          {children}
        </div>
      </header>
      <div className="flap" aria-hidden />
    </>
  );
}

/** The die-cut white window in the band that frames a screen's key figure. */
export function AddressWindow({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className={cn("mt-3 rounded-panel bg-window px-4 pt-3.5 pb-4 lg:max-w-md", className)}>
      {children}
    </section>
  );
}
