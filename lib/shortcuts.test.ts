import { expect, it } from "vitest";
import { matchesShortcut } from "./shortcuts";

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
