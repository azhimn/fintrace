"use client";

import { GearSixIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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

/** The app's sections as tabs cut into the envelope band. A row of its own on a phone, inline on a desktop. */
export function Nav() {
  const path = usePathname();
  const list = useRef<HTMLUListElement>(null);
  // On a phone the tabs scroll sideways; keep the current one in view.
  useEffect(() => {
    list.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [path]);
  return (
    <nav aria-label="Sections" className="order-last -mx-5 w-[calc(100%+2.5rem)] lg:order-none lg:mx-0 lg:w-auto lg:min-w-0 lg:flex-1">
      <ul ref={list} className="flex overflow-x-auto px-3 [scrollbar-width:none] lg:gap-0.5 lg:px-0">
        {TABS.map((tab) => {
          const current = tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center rounded-button px-2.5 text-sm text-kraft-ink lg:px-2 lg:text-[0.9375rem] hover:bg-kraft-ink/8 hover:text-foreground",
                  current && "bg-kraft-ink/20 font-medium text-foreground hover:bg-kraft-ink/20",
                )}
              >
                {tab.href === "/settings" ? (
                  <>
                    {/* Ten tabs don't fit a desktop band, so Settings becomes its gear there. */}
                    <span className="lg:sr-only">{tab.label}</span>
                    <GearSixIcon weight="fill" aria-hidden className="hidden size-5 lg:block" />
                  </>
                ) : (
                  tab.label
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
