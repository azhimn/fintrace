import { describe, expect, it } from "vitest";
import { envelopeHue, nextHue } from "./hue";

describe("Budget hues", () => {
  it("keeps the stored hue whatever the sort order", () => {
    expect(envelopeHue({ hue: 2, isSystem: false })).toBe("var(--hue-lilac)");
    expect(envelopeHue({ hue: 2, isSystem: true })).toBe("var(--kraft)");
  });

  it("gives a new Budget the least used hue", () => {
    expect(nextHue([])).toBe(0);
    expect(nextHue([0, 1, 2, 3, 4, 5, 0, 1])).toBe(2);
    expect(nextHue([0, 0, 2, 3, 4, 5])).toBe(1);
  });
});
