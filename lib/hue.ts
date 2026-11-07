export const HUES = ["mint", "apricot", "lilac", "sky", "rose", "butter"] as const;

/**
 * One pastel per Budget, used everywhere it appears. The hue is stored per envelope, so reordering
 * Budgets never recolours them. Unallocated is kraft: money still in the pay envelope.
 */
export const envelopeHue = (e: { hue: number; isSystem: boolean }) =>
  e.isSystem ? "var(--kraft)" : `var(--hue-${HUES[e.hue % HUES.length]})`;

/** The hue for a new Budget: the one fewest other Budgets use, earliest first on a tie. */
export function nextHue(used: number[]) {
  const counts = HUES.map((_, i) => used.filter((h) => h % HUES.length === i).length);
  return counts.indexOf(Math.min(...counts));
}
