const HUES = ["mint", "apricot", "lilac", "sky", "rose", "butter"];

/**
 * One pastel per Budget, used everywhere it appears. Unallocated is kraft: money still in the
 * pay envelope. shortcut: keyed on sort order, so reordering Budgets in Settings (M5) recolours
 * them; store a hue per envelope if that bothers anyone.
 */
export const envelopeHue = (e: { sortOrder: number; isSystem: boolean }) =>
  e.isSystem ? "var(--kraft)" : `var(--hue-${HUES[e.sortOrder % HUES.length]})`;
