"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, ViewTransition } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/plan", label: "Plan" },
  { href: "/budgets", label: "Budgets" },
  { href: "/reconcile", label: "Reconcile" },
  { href: "/analytics", label: "Analytics" },
  { href: "/cycles", label: "Cycles" },
  { href: "/borrows", label: "Borrows" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/settings", label: "Settings" },
] as const;

/** The app's sections as tabs cut into the envelope band. They scroll sideways where they don't fit. */
export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const list = useRef<HTMLUListElement>(null);
  useTabSwipe(path, router);
  // On a phone the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [path]);
  return (
    <nav aria-label="Sections" className="-mx-5 lg:-mx-2.5">
      <ul ref={list} className="flex overflow-x-auto px-2.5 [scrollbar-width:none] lg:gap-0.5 lg:px-0">
        {TABS.map((tab) => {
          const current = isCurrent(tab.href, path);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center rounded-button px-2.5 text-sm text-kraft-ink transition-colors hover:text-foreground lg:text-[0.9375rem]",
                  current && "font-medium text-foreground",
                )}
              >
                {current && (
                  // A short ink rule under the label. Named, so it slides to the new tab on navigation.
                  <ViewTransition name="nav-current">
                    <span aria-hidden className="absolute inset-x-2.5 bottom-1.5 h-0.5 rounded-full bg-foreground" />
                  </ViewTransition>
                )}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const isCurrent = (href: string, path: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Whether a touch should be left alone: something under it already uses a sideways swipe. */
function ownsSwipe(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches("[data-no-page-swipe], input, textarea, select")) return true;
    const x = getComputedStyle(el).overflowX;
    if ((x === "auto" || x === "scroll") && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/**
 * On touch screens, a quick sideways swipe moves to the neighbouring tab: left for the next, right
 * for the previous, wrapping from Settings to Overview and back. Mostly-vertical drags, swipes that
 * start on something that scrolls or swipes sideways, and open sheets are left alone.
 */
function useTabSwipe(path: string, router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;
    const down = (e: TouchEvent) => {
      // An open sheet (or its backdrop) keeps every touch.
      const sheetOpen = !!document.querySelector('[role="dialog"]');
      start = e.touches.length === 1 && !sheetOpen && !ownsSwipe(e.target) ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      const quick = e.timeStamp - start.t < 600;
      start = null;
      const i = TABS.findIndex((t) => isCurrent(t.href, path));
      if (i < 0 || !quick || Math.abs(dx) < 70 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
      router.push(TABS[(i + (dx < 0 ? 1 : -1) + TABS.length) % TABS.length].href);
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchend", up, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchend", up);
    };
  }, [path, router]);
}
