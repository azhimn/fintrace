"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const list = useRef<HTMLUListElement>(null);
  // On a phone the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [path]);
  return (
    <nav aria-label="Sections" className="-mx-5 lg:-mx-2.5">
      <ul ref={list} className="flex overflow-x-auto px-2.5 [scrollbar-width:none] lg:gap-0.5 lg:px-0">
        {TABS.map((tab) => {
          const current = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
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
