"use client";

import { PlusCircleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useRecord } from "@/components/record/record-provider";
import { useIsMac } from "@/components/shell/action";
import { formatBinding } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

/**
 * The Record action. On a phone it is the full-width bar under the band and docks bottom-centre
 * once scrolled away; on a desktop it sits top-right in the band.
 */
export function RecordBar({ placement }: { placement: "band" | "page" }) {
  const { open, data } = useRecord();
  const mac = useIsMac();
  const bar = useRef<HTMLButtonElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    if (placement !== "page" || !bar.current) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting));
    observer.observe(bar.current);
    return () => observer.disconnect();
  }, [placement]);

  const label = (
    <>
      <PlusCircleIcon weight="fill" aria-hidden className="size-6" />
      Record
    </>
  );

  if (placement === "band") {
    return (
      <button
        type="button"
        onClick={() => open()}
        className="hidden h-11 shrink-0 items-center gap-2 rounded-button bg-primary px-5 text-[0.9375rem] font-medium text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_10%)] lg:flex"
      >
        {label}
        <kbd className="ml-1 rounded-sm bg-primary-foreground/20 px-1.5 text-xs font-normal">
          {formatBinding(data.shortcuts.openQuickRecord, mac)}
        </kbd>
      </button>
    );
  }

  return (
    <>
      <button
        ref={bar}
        type="button"
        onClick={() => open()}
        className="mt-[22px] flex h-15 w-full items-center justify-center gap-2.5 rounded-button bg-primary text-[1.1875rem] font-semibold text-primary-foreground active:translate-y-px lg:hidden"
      >
        {label}
      </button>
      <button
        type="button"
        tabIndex={docked ? 0 : -1}
        aria-hidden={!docked}
        onClick={() => open()}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-2.5 rounded-button bg-primary px-7 text-[1.0625rem] font-semibold text-primary-foreground shadow-[0_8px_20px_-6px_rgb(74_91_196/0.55)] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          docked ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {label}
      </button>
    </>
  );
}
