"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A scrollbar drawn over the content: the page's by default, or `target`'s (a scroller inside a
 * `relative` parent, e.g. the Quick Record sheet). Native scrollbars are hidden because they take
 * width: screens that scroll and screens that don't would differ by it, and the band would shift on
 * every switch. Shows while scrolling or when the pointer nears the right edge, and can be dragged.
 * Wheel, keyboard and touch scrolling are the browser's own.
 */
export function ScrollThumb({ target }: { target?: React.RefObject<HTMLElement | null> }) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ y: number; scroll: number } | null>(null);
  // The page scrolls the window; a target scrolls itself.
  const metrics = () => {
    const el = target?.current;
    return el
      ? { view: el.clientHeight, full: el.scrollHeight, pos: el.scrollTop, scroller: el as HTMLElement | Window }
      : { view: window.innerHeight, full: document.documentElement.scrollHeight, pos: window.scrollY, scroller: window as HTMLElement | Window };
  };

  useEffect(() => {
    const el = target?.current;
    const measure = () => {
      const { view, full, pos } = metrics();
      if (full <= view + 1) return setBox(null);
      const height = Math.max(32, (view / full) * view);
      setBox({ height, top: (pos / (full - view)) * (view - height) });
    };
    const onScroll = () => {
      measure();
      setActive(true);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => !drag.current && setActive(false), 1000);
    };
    const resize = new ResizeObserver(measure);
    // A target is watched with its one content child; the page with its body.
    for (const node of el ? [el, ...el.children] : [document.body]) resize.observe(node);
    (el ?? window).addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      resize.disconnect();
      (el ?? window).removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      clearTimeout(idle.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- metrics only reads the ref
  }, [target]);

  if (!box) return null;
  return (
    // A 12px hover strip along the right edge; the thumb inside it is 6px, 8px on hover or drag.
    <div aria-hidden className={cn("group inset-y-0 right-0 z-30 w-3", target ? "absolute" : "fixed")}>
      <div
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, scroll: metrics().pos };
          setActive(true);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const { view, full, scroller } = metrics();
          const ratio = (full - view) / (view - box.height);
          scroller.scrollTo({ top: drag.current.scroll + (e.clientY - drag.current.y) * ratio, behavior: "instant" });
        }}
        onPointerUp={() => {
          drag.current = null;
          idle.current = setTimeout(() => setActive(false), 1000);
        }}
        style={{ height: box.height, transform: `translateY(${box.top}px)` }}
        className={cn(
          "absolute right-0.5 w-1.5 touch-none rounded-full bg-[color-mix(in_oklch,var(--track),var(--kraft-ink)_30%)] opacity-0 transition-[opacity,width] duration-200 group-hover:w-2 group-hover:opacity-100",
          active && "w-2 opacity-100",
        )}
      />
    </div>
  );
}
