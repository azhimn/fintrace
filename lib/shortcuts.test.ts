import { expect, it } from "vitest";
import { bindingFromEvent, bindingProblem, DEFAULT_SHORTCUTS, formatBinding, matchesShortcut, shortcutConflicts } from "./shortcuts";

const key = (k: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

it("matches a plain key only without modifiers", () => {
  expect(matchesShortcut(key("r"), "r")).toBe(true);
  expect(matchesShortcut(key("R", { shiftKey: true }), "r")).toBe(false);
  expect(matchesShortcut(key("r", { ctrlKey: true }), "r")).toBe(false);
});

it("treats mod as Ctrl or Cmd", () => {
  expect(matchesShortcut(key("Enter", { ctrlKey: true }), "mod+enter")).toBe(true);
  expect(matchesShortcut(key("Enter", { metaKey: true }), "mod+enter")).toBe(true);
  expect(matchesShortcut(key("Enter"), "mod+enter")).toBe(false);
});

it("matches Escape and explicit modifiers", () => {
  expect(matchesShortcut(key("Escape"), "escape")).toBe(true);
  expect(matchesShortcut(key("n", { altKey: true, shiftKey: true }), "alt+shift+n")).toBe(true);
  expect(matchesShortcut(key("n", { metaKey: true }), "ctrl+n")).toBe(false);
});

it("turns a key press into a binding that matches it again", () => {
  const press = key("Enter", { metaKey: true });
  expect(bindingFromEvent(press)).toBe("mod+enter");
  expect(matchesShortcut(press, bindingFromEvent(press)!)).toBe(true);
  expect(bindingFromEvent(key("N", { shiftKey: true, altKey: true }))).toBe("alt+shift+n");
  expect(bindingFromEvent(key("Shift", { shiftKey: true }))).toBeNull();
});

it("refuses bindings that would hijack typing", () => {
  expect(bindingProblem("openQuickRecord", "n")).toBeNull();
  expect(bindingProblem("close", "x")).not.toBeNull();
  expect(bindingProblem("close", "escape")).toBeNull();
  expect(bindingProblem("saveAndAddAnother", "alt+s")).toBeNull();
  expect(bindingProblem("openQuickRecord", "tab")).not.toBeNull();
});

it("finds actions sharing a binding", () => {
  expect(shortcutConflicts(DEFAULT_SHORTCUTS)).toEqual([]);
  expect(shortcutConflicts({ ...DEFAULT_SHORTCUTS, close: "mod+enter" })).toEqual(["saveAndAddAnother", "close"]);
});

it("formats bindings for people", () => {
  expect(formatBinding("mod+enter")).toBe("Ctrl + Enter");
  expect(formatBinding("mod+enter", true)).toBe("⌘ + Enter");
  expect(formatBinding("escape")).toBe("Esc");
  expect(formatBinding("r")).toBe("R");
});
