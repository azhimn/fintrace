"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// The inline script in app/layout.tsx applies the same key before first paint.
const KEY = "theme";
const CHOICES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;
type Theme = (typeof CHOICES)[number]["value"];

const stored = (): Theme => {
  const t = localStorage.getItem(KEY);
  return t === "light" || t === "dark" ? t : "system";
};

function apply(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));

/** Re-applies the saved theme after React's dev remount clears attributes on <html>; a no-op in production. */
export function ThemeSync() {
  useLayoutEffect(() => apply(stored()), []);
  return null;
}

/** System, Light or Dark, saved on this device. */
export function ThemeChoice() {
  const theme = useSyncExternalStore(subscribe, stored, () => "system" as Theme);

  function choose(next: Theme) {
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
    apply(next);
    listeners.forEach((fn) => fn());
  }

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-panel bg-panel p-1">
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          role="radio"
          aria-checked={theme === c.value}
          onClick={() => choose(c.value)}
          className={cn(
            "h-11 rounded-button text-[0.9375rem] hover:bg-accent",
            theme === c.value && "bg-secondary hover:bg-secondary",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
