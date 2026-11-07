// SPEC section 5 Settings: configurable shortcuts, stored per user in settings.shortcuts.
export const DEFAULT_SHORTCUTS = {
  openQuickRecord: "r",
  saveAndAddAnother: "mod+enter",
  close: "escape",
};
export type Shortcuts = typeof DEFAULT_SHORTCUTS;
export type ShortcutAction = keyof Shortcuts;

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  openQuickRecord: "Open Record",
  saveAndAddAnother: "Save & add another",
  close: "Close Record",
};
/** These two also fire while typing in a field, so a plain letter would hijack typing. */
const WORKS_WHILE_TYPING: ShortcutAction[] = ["saveAndAddAnother", "close"];

type Keys = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;

/** Whether a key event is a binding like 'r', 'mod+enter' or 'escape'. mod is Ctrl, or Cmd on a Mac. */
export function matchesShortcut(e: Keys, binding: string) {
  const parts = binding.toLowerCase().split("+");
  const key = parts.pop();
  const has = (m: string) => parts.includes(m);
  const ctrlOrMeta = has("mod") ? e.ctrlKey || e.metaKey : e.ctrlKey === has("ctrl") && e.metaKey === has("meta");
  return ctrlOrMeta && e.altKey === has("alt") && e.shiftKey === has("shift") && e.key.toLowerCase() === key;
}

/** Plain-key shortcuts are ignored while the user types in a field. */
export const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

const MODIFIER_KEYS = ["control", "meta", "alt", "shift", "os"];

/** The binding a key press makes, like 'mod+enter', or null for a bare modifier press. Ctrl and Cmd both become mod. */
export function bindingFromEvent(e: Keys) {
  const key = e.key.toLowerCase();
  if (MODIFIER_KEYS.includes(key) || key === "dead" || key === "unidentified") return null;
  const mods = [e.ctrlKey || e.metaKey ? "mod" : "", e.altKey ? "alt" : "", e.shiftKey ? "shift" : ""].filter(Boolean);
  return [...mods, key === " " ? "space" : key].join("+");
}

/** Why a binding can't be used for an action, or null when it can. */
export function bindingProblem(action: ShortcutAction, binding: string) {
  const parts = binding.split("+");
  const key = parts.at(-1)!;
  if (key === "tab") return "Tab moves between fields, so it can't be a shortcut";
  if (key === "space") return "Space can't be a shortcut";
  const modified = parts.some((p) => ["mod", "ctrl", "meta", "alt"].includes(p));
  if (WORKS_WHILE_TYPING.includes(action) && !modified && key !== "escape") {
    return "This one works while you type, so it needs Ctrl, Cmd or Alt";
  }
  return null;
}

/** Actions that share a binding with another action. */
export function shortcutConflicts(shortcuts: Shortcuts) {
  const entries = Object.entries(shortcuts) as [ShortcutAction, string][];
  return entries.filter(([a, b]) => entries.some(([other, ob]) => other !== a && ob === b)).map(([a]) => a);
}

/** 'mod+enter' as people read it: 'Ctrl + Enter', or '⌘ + Enter' on a Mac. */
export function formatBinding(binding: string, mac = false) {
  const names: Record<string, string> = { mod: mac ? "⌘" : "Ctrl", alt: mac ? "⌥" : "Alt", shift: "Shift", escape: "Esc", arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→" };
  return binding
    .split("+")
    .map((p) => names[p] ?? (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" + ");
}
