"use client";

import { useId, useState } from "react";
import { setPayDay, setShortcuts } from "@/app/(app)/actions";
import { useIsMac, useAction } from "@/components/shell/action";
import { Button } from "@/components/ui/button";
import {
  bindingFromEvent,
  bindingProblem,
  DEFAULT_SHORTCUTS,
  formatBinding,
  SHORTCUT_LABELS,
  shortcutConflicts,
  type ShortcutAction,
  type Shortcuts,
} from "@/lib/shortcuts";
import { cn } from "@/lib/utils";

/** The default pay day, typed straight into the address window like Quick Record's amount. */
export function PayDayWindow({ payDay }: { payDay: number }) {
  const [text, setText] = useState(String(payDay));
  const { run, pending, alert } = useAction();
  const id = useId();
  const day = Number(text);
  const valid = Number.isInteger(day) && day >= 1 && day <= 31;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setPayDay(day), `New cycles start on day ${day}`);
      }}
    >
      <label htmlFor={id} className="text-[0.8125rem] font-medium text-kraft-ink">
        Default pay day
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={`${id}-hint`}
          className="figure h-12 w-12 min-w-0 bg-transparent text-[2.125rem] leading-tight font-semibold tracking-[-0.01em] outline-none"
        />
        <span className="text-[0.9375rem] text-kraft-ink">of the month</span>
        {valid && day !== payDay && (
          <Button type="submit" disabled={pending} className="ml-auto h-11 px-4 text-[0.9375rem]">
            Save
          </Button>
        )}
      </div>
      <p id={`${id}-hint`} className="mt-1 text-[0.8125rem] text-kraft-ink">
        {valid ? "Fills in new cycles. Move one cycle's pay day on Cycles." : "Pick a day from 1 to 31."}
      </p>
      {alert && <div className="mt-2">{alert}</div>}
    </form>
  );
}

/** Editable key bindings: press Change, then the keys. Clashes and bindings that would block typing are refused. */
export function ShortcutEditor({ saved }: { saved: Shortcuts }) {
  const [draft, setDraft] = useState<Shortcuts>(saved);
  const [listening, setListening] = useState<ShortcutAction | null>(null);
  const [problems, setProblems] = useState<Partial<Record<ShortcutAction, string>>>({});
  const { run, pending, alert } = useAction();
  const mac = useIsMac();
  const conflicts = shortcutConflicts(draft);
  const actions = Object.keys(SHORTCUT_LABELS) as ShortcutAction[];
  const changed = actions.some((a) => draft[a] !== saved[a]);
  const isDefault = actions.every((a) => draft[a] === DEFAULT_SHORTCUTS[a]);

  function capture(action: ShortcutAction, e: React.KeyboardEvent) {
    // Tab still leaves the button; everything else becomes the binding.
    if (e.key === "Tab") return setListening(null);
    e.preventDefault();
    e.stopPropagation();
    const binding = bindingFromEvent(e);
    if (!binding) return;
    const problem = bindingProblem(action, binding);
    setProblems((p) => ({ ...p, [action]: problem ?? undefined }));
    if (problem) return;
    setDraft((d) => ({ ...d, [action]: binding }));
    setListening(null);
  }

  return (
    <div className="rounded-panel bg-panel">
      <ul>
        {actions.map((a) => {
          const clash = conflicts.includes(a);
          return (
            <li key={a} className="border-t border-divider px-4 py-3 first:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-[0.9375rem]">
                  {SHORTCUT_LABELS[a]}
                  {a === "openQuickRecord" && <span className="mt-px block text-xs text-muted-foreground">Ignored while you type in a field</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setListening(listening === a ? null : a)}
                  onKeyDown={(e) => listening === a && capture(a, e)}
                  onBlur={() => listening === a && setListening(null)}
                  aria-label={listening === a ? `Press the new keys for ${SHORTCUT_LABELS[a]}` : `Change ${SHORTCUT_LABELS[a]}, now ${formatBinding(draft[a], mac)}`}
                  className={cn(
                    "flex h-11 min-w-28 shrink-0 items-center justify-center gap-2 rounded-button px-3 text-[0.9375rem] hover:bg-accent",
                    listening === a ? "bg-secondary hover:bg-secondary" : "bg-background",
                    clash && "bg-destructive-soft/50 text-destructive hover:bg-destructive-soft/50",
                  )}
                >
                  {listening === a ? (
                    "Press keys…"
                  ) : (
                    <kbd className="figure font-sans">{formatBinding(draft[a], mac)}</kbd>
                  )}
                </button>
              </div>
              {(problems[a] || clash) && (
                <p className="mt-1.5 text-sm text-destructive">{problems[a] ?? "Another action uses these keys. Change one of them."}</p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-divider px-4 py-3">
        <Button
          size="lg"
          disabled={pending || !changed || conflicts.length > 0}
          onClick={() => run(() => setShortcuts(draft), "Shortcuts saved")}
          className="h-11 text-[0.9375rem]"
        >
          Save shortcuts
        </Button>
        <Button
          size="lg"
          variant="ghost"
          disabled={isDefault}
          onClick={() => {
            setDraft(DEFAULT_SHORTCUTS);
            setProblems({});
          }}
          className="h-11 text-[0.9375rem] text-muted-foreground"
        >
          Reset to defaults
        </Button>
        {alert && <div className="w-full">{alert}</div>}
      </div>
    </div>
  );
}
