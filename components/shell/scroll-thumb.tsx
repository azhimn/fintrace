"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The page's scrollbar, drawn over the content. The native one is hidden (globals.css) because it
 * takes width: screens that scroll and screens that don't would differ by its width, and the band
 * would shift on every switch. Shows while scrolling or when the pointer nears the right edge, and
 * can be dragged. Wheel, keyboard and touch scrolling are the browser's own.
 */
export function ScrollThumb() {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  const [active, setActive] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const drag = useRef<{ y: number; scroll: number } | null>(null);

  useEffect(() => {
    const doc = document.documentElement;
    const measure = () => {
      const view = window.innerHeight;
      const full = doc.scrollHeight;
      if (full <= view + 1) return setBox(null);
      const height = Math.max(32, (view / full) * view);
      setBox({ height, top: (window.scrollY / (full - view)) * (view - height) });
    };
    const onScroll = () => {
      measure();
      setActive(true);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => !drag.current && setActive(false), 1000);
    };
    const resize = new ResizeObserver(measure);
    resize.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      clearTimeout(idle.current);
    };
  }, []);

  if (!box) return null;
  return (
    // A 12px hover strip along the right edge; the thumb inside it is 6px, 8px on hover or drag.
    <div aria-hidden className="group fixed inset-y-0 right-0 z-30 w-3">
      <div
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, scroll: window.scrollY };
          setActive(true);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const view = window.innerHeight;
          const ratio = (document.documentElement.scrollHeight - view) / (view - box.height);
          window.scrollTo({ top: drag.current.scroll + (e.clientY - drag.current.y) * ratio, behavior: "instant" });
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
