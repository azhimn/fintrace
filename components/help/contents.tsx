"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The guide's chapter list. A row of chips on a phone; on a desktop a column that stays beside the
 * text and marks the chapter being read, like a documentation site's sidebar.
 */
export function Contents({ label, sections }: { label: string; sections: { id: string; title: string }[] }) {
  const [current, setCurrent] = useState(sections[0]?.id);
  // The chapter a click is scrolling to. Until it arrives the highlight stays on it instead of passing over every chapter between.
  const target = useRef<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      if (target.current) return;
      // The last chapter whose heading has reached the top third; the final one once the page bottoms out.
      const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let id = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && (bottom || el.getBoundingClientRect().top <= window.innerHeight / 3)) id = s.id;
      }
      setCurrent(id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  // Moves the desktop bar onto the current chapter; its CSS transition does the sliding.
  useLayoutEffect(() => {
    const link = list.current?.querySelector<HTMLElement>("[aria-current]");
    if (!link || !bar.current) return;
    bar.current.style.transform = `translateY(${link.offsetTop}px)`;
    bar.current.style.height = `${link.offsetHeight}px`;
  }, [current, sections]);

  function jump(e: React.MouseEvent, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    target.current = id;
    setCurrent(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    // The hash goes in once the scroll has finished, so the router doesn't also jump to it midway.
    // The timeout covers a scroll that never starts (already there) or a browser without scrollend.
    const done = () => {
      if (target.current !== id) return;
      target.current = null;
      history.pushState(null, "", `#${id}`);
    };
    window.addEventListener("scrollend", done, { once: true });
    setTimeout(done, 1000);
  }

  return (
    <nav aria-label={label} className="mt-[22px] lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:[scrollbar-width:none]">
      <h2 className="mb-2 text-sm font-semibold">{label}</h2>
      <ol ref={list} className="relative flex flex-wrap gap-2 lg:flex-col lg:gap-0.5 lg:border-l lg:border-border">
        <span
          ref={bar}
          aria-hidden
          className="absolute top-0 left-0 -ml-px hidden w-0.5 bg-foreground transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:block"
        />
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              onClick={(e) => jump(e, s.id)}
              aria-current={s.id === current ? "location" : undefined}
              className={cn(
                "block rounded-button bg-panel px-3 py-2 hover:bg-accent",
                "lg:rounded-none lg:bg-transparent lg:py-1.5 lg:hover:bg-transparent",
                s.id === current ? "lg:font-medium" : "lg:text-muted-foreground lg:hover:text-foreground",
              )}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Remembers the guide's language, so the sidebar's plain /help link opens it next time. */
export function RememberLanguage({ lang }: { lang: string }) {
  useEffect(() => {
    document.cookie = `guide-lang=${lang}; path=/help; max-age=31536000; samesite=lax`;
  }, [lang]);
  return null;
}
