"use client";

import { DotsThreeIcon } from "@phosphor-icons/react";
import { Menu } from "@base-ui/react/menu";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toasts } from "@/components/record/toast";
import { cn } from "@/lib/utils";

export const fieldClass =
  "h-11 w-full min-w-0 rounded-field bg-field px-3 text-base outline-none focus-visible:shadow-[0_0_0_2px_var(--primary)] aria-invalid:shadow-[0_0_0_2px_var(--destructive)]";
export const labelClass = "flex flex-col gap-2 text-[0.8125rem] font-medium text-muted-foreground";

/**
 * Runs a Server Action that answers with an error message (or false), or null (or true) when it
 * worked. Shows a toast on success and keeps the error for an inline alert.
 */
export function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<string | boolean | null>, done?: string, onDone?: () => void) =>
    startTransition(async () => {
      try {
        const result = await action();
        const message = result === false ? "That didn't work. Reload and try again." : typeof result === "string" ? result : null;
        setError(message);
        if (message) return;
        if (done) toasts.add({ title: done, timeout: 4000 });
        onDone?.();
      } catch {
        setError("You're offline. Try again once you're back online.");
      }
    });
  const alert = error && (
    <p role="alert" className="rounded-panel bg-destructive-soft/50 px-4 py-3 text-sm text-destructive">
      {error}
    </p>
  );
  return { run, pending, alert, error, setError };
}

export type MenuAction = { label: string; onClick: () => void; destructive?: boolean };

/** The ⋯ menu at the end of a row. */
export function RowMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const item = "flex h-11 cursor-default items-center rounded-field px-3 text-[0.9375rem] outline-none select-none data-highlighted:bg-field";
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className="flex size-11 shrink-0 items-center justify-center rounded-button text-quiet-control hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
      >
        <DotsThreeIcon weight="fill" className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-50">
          <Menu.Popup className="min-w-44 rounded-panel bg-panel p-1 shadow-[0_8px_24px_-8px_rgb(61_56_50/0.3)] outline-none">
            {actions.map((a) => (
              <Menu.Item key={a.label} onClick={a.onClick} className={cn(item, a.destructive && "text-destructive")}>
                {a.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

const noSubscribe = () => () => {};
/** Whether mod means Cmd here. False while rendering on the server. */
export const useIsMac = () =>
  useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.userAgent), () => false);

/** A checkbox drawn as a chip: Panel Tint at rest, Pastel Periwinkle when on. */
export function ToggleChip({
  checked,
  disabled,
  onChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative inline-block">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="flex h-11 cursor-pointer items-center rounded-button bg-background px-4 text-[0.9375rem] whitespace-nowrap text-muted-foreground hover:bg-accent peer-checked:bg-secondary peer-checked:text-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-default peer-disabled:opacity-50">
        {children}
      </span>
    </label>
  );
}
