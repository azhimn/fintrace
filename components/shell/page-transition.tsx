"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

/**
 * Crossfades the screen when the path changes. Keyed by path and named, so the old and new screen
 * pair up in one crossfade; same-path refreshes (a save, a filter) don't animate.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <ViewTransition key={path} name="page" share="auto" default="none">
      {/* One element, so the whole screen is one snapshot rather than one per top-level node. */}
      <div>{children}</div>
    </ViewTransition>
  );
}
