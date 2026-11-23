"use client";

import { PlusCircleIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useRecord } from "@/components/record/record-provider";

/**
 * The Record action: one button floating bottom-right on every screen, above the safe area on a phone.
 * Its name slides out on hover or keyboard focus.
 */
export function RecordBar() {
  const { open } = useRecord();
  // /record is Quick Record itself.
  if (usePathname() === "/record") return null;
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="Record"
      className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex h-14 min-w-14 items-center justify-center rounded-button bg-foreground px-4 text-window shadow-[0_8px_20px_-6px_rgb(61_56_50/0.35)] hover:bg-[color-mix(in_oklch,var(--foreground),var(--kraft-ink)_40%)] active:translate-y-px lg:right-8 lg:bottom-8"
    >
      <PlusCircleIcon weight="fill" aria-hidden className="size-6" />
      <span aria-hidden className="reveal-label">
        Record
      </span>
    </button>
  );
}
