// SPEC section 5 Settings: configurable shortcuts, stored per user in settings.shortcuts.
export const DEFAULT_SHORTCUTS = {
  openQuickRecord: "r",
  saveAndAddAnother: "mod+enter",
  close: "escape",
};
export type Shortcuts = typeof DEFAULT_SHORTCUTS;

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
