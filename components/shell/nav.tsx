"use client";

import { Drawer } from "@base-ui/react/drawer";
import {
  ArrowsClockwiseIcon,
  CaretDownIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  EnvelopeSimpleIcon,
  EnvelopeSimpleOpenIcon,
  HandCoinsIcon,
  HeartIcon,
  HouseIcon,
  type Icon,
  ReceiptIcon,
  ScalesIcon,
  SidebarSimpleIcon,
  SignOutIcon,
  SlidersHorizontalIcon,
  TagIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, ViewTransition } from "react";
import { ScrollThumb } from "./scroll-thumb";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: Icon };

/** The app's sections in collapsible groups. */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Day to day",
    items: [
      { href: "/", label: "Overview", icon: HouseIcon },
      { href: "/transactions", label: "Transactions", icon: ReceiptIcon },
      { href: "/reconcile", label: "Reconcile", icon: ScalesIcon },
    ],
  },
  {
    label: "Planning",
    items: [
      { href: "/plan", label: "Plan", icon: ClipboardTextIcon },
      { href: "/budgets", label: "Budgets", icon: EnvelopeSimpleIcon },
      { href: "/cycles", label: "Cycles", icon: ArrowsClockwiseIcon },
    ],
  },
  {
    label: "Tracking",
    items: [
      { href: "/analytics", label: "Analytics", icon: ChartBarIcon },
      { href: "/borrows", label: "Borrows", icon: HandCoinsIcon },
      { href: "/wishlist", label: "Wishlist", icon: HeartIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings", label: "General", icon: SlidersHorizontalIcon },
      { href: "/settings/funds", label: "Funds", icon: WalletIcon },
      { href: "/settings/budgets", label: "Budgets", icon: EnvelopeSimpleOpenIcon },
      { href: "/settings/categories", label: "Categories", icon: TagIcon },
    ],
  },
];

// Reached from the user's name at the bottom of the sidebar rather than from the Settings group.
const ACCOUNT: Item = { href: "/settings/account", label: "Account", icon: UserCircleIcon };
const ITEMS = [...GROUPS.flatMap((g) => g.items), ACCOUNT];

/** The item the path is on: the longest href it sits under, so /settings/funds isn't also /settings. */
function currentItem(path: string) {
  let best: Item | undefined;
  for (const item of ITEMS) {
    const under = item.href === "/" ? path === "/" : path === item.href || path.startsWith(item.href + "/");
    if (under && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

// The desktop sidebar collapses to an icon rail while <html data-sidebar="collapsed">. These hide its
// text there; the phone drawer is never on a desktop, so it always shows text.
const railHidden = "lg:[[data-sidebar=collapsed]_&]:sr-only";
const row = "relative flex h-10 items-center gap-3 rounded-button px-2.5 text-[0.9375rem] text-sidebar-ink/75 transition-colors hover:bg-sidebar-ink/10 hover:text-sidebar-ink";

function NavLinks({ onNavigate, slide }: { onNavigate?: () => void; slide?: boolean }) {
  const current = currentItem(usePathname());
  const heading = "px-2.5 text-xs font-medium tracking-wide whitespace-nowrap text-sidebar-ink/60 uppercase";
  return (
    <nav aria-label="Sections" className="flex flex-col gap-5">
      {GROUPS.map((group) => {
        const list = (
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const here = item === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={item.label}
                    aria-current={here ? "page" : undefined}
                    className={cn(row, here && "font-medium text-sidebar-ink")}
                  >
                    {here &&
                      (slide ? (
                        // Named, so the highlight slides to the new item on navigation.
                        <ViewTransition name="nav-current">
                          <span aria-hidden className="absolute inset-0 rounded-button bg-sidebar-ink/15" />
                        </ViewTransition>
                      ) : (
                        <span aria-hidden className="absolute inset-0 rounded-button bg-sidebar-ink/15" />
                      ))}
                    <item.icon aria-hidden weight={here ? "fill" : "regular"} className="relative size-5 shrink-0" />
                    <span className={cn("relative truncate", railHidden)}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        );
        const holdsCurrent = !!current && group.items.includes(current);
        // Groups start open. Keyed by holding the current page, so moving into a group you closed opens it again.
        return (
          <details key={`${group.label}-${holdsCurrent}`} open className="disclosure group">
            <summary
              title={group.label}
              className={cn(
                heading,
                "flex h-8 cursor-pointer list-none items-center justify-between rounded-button hover:text-sidebar-ink [&::-webkit-details-marker]:hidden",
                "lg:[[data-sidebar=collapsed]_&]:justify-center lg:[[data-sidebar=collapsed]_&]:hover:bg-sidebar-ink/10",
              )}
            >
              <span className={railHidden}>{group.label}</span>
              <CaretDownIcon
                aria-hidden
                className="size-3.5 transition-transform group-open:rotate-180"
              />
            </summary>
            {list}
          </details>
        );
      })}
    </nav>
  );
}

type AccountProps = { username: string; signOut: () => Promise<void> };

/** The signed-in user, linking to their Account settings, and Sign out beside it (below it on the icon rail). */
function Account({ username, signOut, onNavigate, className }: AccountProps & { onNavigate?: () => void; className?: string }) {
  const here = currentItem(usePathname()) === ACCOUNT;
  return (
    <div className={cn("flex items-center gap-1 pt-2 lg:[[data-sidebar=collapsed]_&]:flex-col", className)}>
      <Link
        href={ACCOUNT.href}
        onClick={onNavigate}
        title={`${username}, account settings`}
        aria-current={here ? "page" : undefined}
        className={cn(row, "min-w-0 flex-1 lg:[[data-sidebar=collapsed]_&]:w-10", here && "bg-sidebar-ink/15 font-medium text-sidebar-ink")}
      >
        <UserCircleIcon aria-hidden weight={here ? "fill" : "regular"} className="size-5 shrink-0" />
        <span className={cn("truncate", railHidden)}>{username}</span>
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Sign out"
          title="Sign out"
          className="flex size-10 items-center justify-center rounded-button text-sidebar-ink/75 hover:bg-sidebar-ink/10 hover:text-sidebar-ink"
        >
          <SignOutIcon aria-hidden className="size-5" />
        </button>
      </form>
    </div>
  );
}

// The inline script in app/layout.tsx applies the same key before first paint.
const COLLAPSED_KEY = "sidebar-collapsed";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));
const storedCollapsed = () => localStorage.getItem(COLLAPSED_KEY) === "1";

function applyCollapsed(collapsed: boolean) {
  if (collapsed) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
}

function setCollapsed(collapsed: boolean) {
  if (collapsed) localStorage.setItem(COLLAPSED_KEY, "1");
  else localStorage.removeItem(COLLAPSED_KEY);
  applyCollapsed(collapsed);
  listeners.forEach((fn) => fn());
}

/** Whether `ref` can scroll further up and down, rechecked on scroll and whenever it or its content resizes. */
function useMoreHidden(ref: React.RefObject<HTMLElement | null>) {
  const [above, setAbove] = useState(false);
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      setAbove(el.scrollTop > 1);
      setBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
    };
    const resize = new ResizeObserver(check);
    for (const node of [el, ...el.children]) resize.observe(node);
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => {
      resize.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [ref]);
  return { above, below };
}

/** The scrolling part of the sidebar or drawer: soft edge shadows while more is hidden, and the floating thumb. */
function Sections({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const more = useMoreHidden(scroller);
  return (
    <div className="relative -mx-3 min-h-0 flex-1">
      <div ref={scroller} className="h-full overflow-x-hidden overflow-y-auto overscroll-contain px-3 [scrollbar-width:none]">
        {children}
      </div>
      {/* Soft shadows over the top and bottom edges while more sections are scrolled out of view. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-black/20 to-transparent transition-opacity duration-200",
          !more.above && "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-black/20 to-transparent transition-opacity duration-200",
          !more.below && "opacity-0",
        )}
      />
      <ScrollThumb target={scroller} />
    </div>
  );
}

// Ties the band's menu button to the drawer as its real trigger, so Base UI treats the opening tap as
// the trigger's and not as a tap outside the drawer that closes it again.
const drawer = Drawer.createHandle();

/**
 * The sections down the left of a desktop screen, collapsible to an icon rail, with the signed-in
 * user at the bottom. On a phone the same lives in a drawer: a swipe right anywhere pulls it open under the finger, a swipe left closes it.
 */
export function Sidebar(account: AccountProps) {
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribe, storedCollapsed, () => false);
  // Re-applies the saved state after React's dev remount clears attributes on <html>; a no-op in production.
  useLayoutEffect(() => applyCollapsed(storedCollapsed()), []);
  usePullToOpen(setOpen);
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col overflow-hidden bg-sidebar px-3 pt-3 pb-3 text-sidebar-ink transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex lg:[[data-sidebar=collapsed]_&]:w-16">
        <div className="mb-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-10 shrink-0 items-center justify-center rounded-button text-sidebar-ink/75 hover:bg-sidebar-ink/10 hover:text-sidebar-ink"
          >
            <SidebarSimpleIcon aria-hidden weight={collapsed ? "regular" : "fill"} className="size-5" />
          </button>
          {/* The wordmark, as on the sign-in screen. */}
          <span className="text-base font-semibold lg:[[data-sidebar=collapsed]_&]:hidden">fintrace</span>
        </div>
        {/* Only the sections scroll; the header and account stay put. */}
        <Sections>
          <NavLinks slide />
        </Sections>
        {/* Named, so during navigation it is lifted above the sliding highlight instead of under it.
            Only here: the drawer's copy may still be closing then, and a duplicate name skips the transition. */}
        <Account {...account} className="bg-sidebar [view-transition-name:sidebar-account]" />
      </aside>
      <Drawer.Root handle={drawer} open={open} onOpenChange={setOpen} swipeDirection="left">
        <Drawer.Portal>
          <Drawer.Backdrop className="drawer-backdrop fixed inset-0 z-50 bg-foreground opacity-[calc(0.35*(1-var(--drawer-swipe-progress)))] transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0" />
          <Drawer.Viewport className="fixed inset-0 z-50">
            <Drawer.Popup className="drawer-popup fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-sidebar px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sidebar-ink outline-none [transform:translateX(var(--drawer-swipe-movement-x))] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:[transform:translateX(-100%)] data-starting-style:[transform:translateX(-100%)] data-swiping:duration-0">
              <div className="mb-3 flex items-center gap-1">
                <Drawer.Close
                  aria-label="Close sidebar"
                  title="Close sidebar"
                  className="flex size-10 shrink-0 items-center justify-center rounded-button text-sidebar-ink/75 hover:bg-sidebar-ink/10 hover:text-sidebar-ink"
                >
                  <SidebarSimpleIcon aria-hidden weight="fill" className="size-5" />
                </Drawer.Close>
                <Drawer.Title className="text-base font-semibold">fintrace</Drawer.Title>
              </div>
              <Sections>
                <NavLinks onNavigate={() => setOpen(false)} />
              </Sections>
              <Account {...account} onNavigate={() => setOpen(false)} />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

/** On a phone: the menu button and the fintrace wordmark in the band, opening the sections as a drawer from the left. */
export function MenuButton() {
  return (
    <Drawer.Trigger
      handle={drawer}
      aria-label="Open menu"
      className="group flex h-10 items-center gap-1 rounded-button pr-3 text-base font-semibold lg:hidden"
    >
      {/* The same 40px box as the drawer's close button, so the drawer opens exactly over this row. */}
      <span className="flex size-10 items-center justify-center rounded-button text-sidebar-ink/75 group-hover:bg-sidebar-ink/10 group-hover:text-sidebar-ink">
        <SidebarSimpleIcon aria-hidden weight="fill" className="size-5" />
      </span>
      <span aria-hidden>fintrace</span>
    </Drawer.Trigger>
  );
}

/** Whether a touch should be left alone: something under it already uses a sideways swipe. */
function ownsSwipe(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches("input, textarea, select")) return true;
    const x = getComputedStyle(el).overflowX;
    if ((x === "auto" || x === "scroll") && el.scrollWidth > el.clientWidth) return true;
  }
  return false;
}

/**
 * On phones, a swipe right that starts anywhere pulls the drawer open under the finger. Once the drag
 * is clearly sideways the drawer opens with <html data-drawer-pull> set, and globals.css places it from
 * --drawer-pull (px) instead of its own transform. On release it opens fully past a third of its width
 * or on a flick, and otherwise slides shut. Vertical drags, form fields, things that scroll sideways,
 * desktops and an open dialog are left alone.
 */
function usePullToOpen(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const root = document.documentElement;
    let start: { x: number; y: number; t: number } | null = null;
    let pulling = false;
    let dx = 0;
    const width = () => Math.min(288, window.innerWidth * 0.85);
    const stop = () => {
      start = null;
      pulling = false;
      delete root.dataset.drawerPull;
      root.style.removeProperty("--drawer-pull");
      root.style.removeProperty("--drawer-pull-progress");
    };
    const down = (e: TouchEvent) => {
      const phone = !window.matchMedia("(min-width: 64rem)").matches;
      const dialogOpen = !!document.querySelector('[role="dialog"]');
      start =
        phone && e.touches.length === 1 && !dialogOpen && !ownsSwipe(e.target)
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: e.timeStamp }
          : null;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      dx = e.touches[0].clientX - start.x;
      const dy = e.touches[0].clientY - start.y;
      if (!pulling) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (start = null);
        if (dx < 10 || dx < 1.5 * Math.abs(dy)) return;
        pulling = true;
        root.dataset.drawerPull = "";
        setOpen(true);
      }
      e.preventDefault();
      const pull = Math.max(0, Math.min(dx, width()));
      root.style.setProperty("--drawer-pull", `${pull}px`);
      root.style.setProperty("--drawer-pull-progress", String(pull / width()));
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const wasPulling = pulling;
      const flick = dx / Math.max(1, e.timeStamp - start.t) > 0.5;
      const keep = dx > width() / 3 || flick;
      stop();
      if (wasPulling && !keep) setOpen(false);
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up, { passive: true });
    document.addEventListener("touchcancel", stop, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      document.removeEventListener("touchcancel", stop);
      stop();
    };
  }, [setOpen]);
}
