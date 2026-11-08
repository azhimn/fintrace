"use client";

import { PlusCircleIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useRecord } from "@/components/record/record-provider";
import { Tip } from "@/components/ui/tip";
import { cn } from "@/lib/utils";

/**
 * The Record action. On a phone it is the full-width bar under the band and docks bottom-centre
 * once scrolled away; on a desktop it floats bottom-right on every screen.
 */
export function RecordBar({ placement }: { placement: "float" | "page" }) {
  const { open } = useRecord();
  const path = usePathname();
  const bar = useRef<HTMLButtonElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    if (placement !== "page" || !bar.current) return;
    const observer = new IntersectionObserver(([entry]) => setDocked(!entry.isIntersecting));
    observer.observe(bar.current);
    return () => observer.disconnect();
  }, [placement]);

  const icon = <PlusCircleIcon weight="fill" aria-hidden className="size-6" />;

  if (placement === "float") {
    // /record is Quick Record itself.
    if (path === "/record") return null;
    return (
      <Tip label="Record">
        <button
          type="button"
          onClick={() => open()}
          className="fixed right-8 bottom-8 z-40 hidden size-14 items-center justify-center rounded-button bg-foreground text-window shadow-[0_8px_20px_-6px_rgb(61_56_50/0.35)] hover:bg-[color-mix(in_oklch,var(--foreground),var(--kraft-ink)_40%)] active:translate-y-px lg:flex"
        >
          {icon}
        </button>
      </Tip>
    );
  }

  return (
    <>
      <button
        ref={bar}
        type="button"
        onClick={() => open()}
        className="mt-[22px] flex h-15 w-full items-center justify-center gap-2.5 rounded-button bg-foreground text-[1.1875rem] font-semibold text-window active:translate-y-px lg:hidden"
      >
        <PlusCircleIcon weight="fill" aria-hidden className="size-6" />
        Record
      </button>
      <button
        type="button"
        tabIndex={docked ? 0 : -1}
        aria-hidden={!docked}
        aria-label="Record"
        onClick={() => open()}
        className={cn(
          "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-40 flex size-14 -translate-x-1/2 items-center justify-center rounded-button bg-foreground text-window shadow-[0_8px_20px_-6px_rgb(61_56_50/0.35)] transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          docked ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {icon}
      </button>
    </>
  );
}
