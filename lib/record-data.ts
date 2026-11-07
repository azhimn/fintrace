import "server-only";
import type { Dal } from "./dal";
import { envelopeHue } from "./hue";
import { DEFAULT_SHORTCUTS } from "./shortcuts";

/** What Quick Record needs to draw its choices, for the signed-in user. */
export async function recordData(dal: Dal) {
  const [accounts, envelopes, categories, subcategories, settings, usage] = await Promise.all([
    dal.accounts(),
    dal.envelopes(),
    dal.categories(),
    dal.subcategories(),
    dal.settings(),
    dal.accountUsage(),
  ]);
  return {
    accounts: accounts
      .filter((a) => !a.archived)
      .map(({ id, name, kind }) => ({ id, name, kind, sourceUses: usage.source[id] ?? 0, destUses: usage.dest[id] ?? 0 })),
    envelopes: envelopes.map((e) => ({ id: e.id, name: e.name, isSystem: e.isSystem, hue: envelopeHue(e) })),
    categories: categories
      .filter((c) => !c.archived)
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind,
        subs: subcategories
          .filter((s) => s.categoryId === c.id)
          .map((s) => ({ id: s.id, name: s.name, defaultClassification: s.defaultClassification })),
      })),
    shortcuts: { ...DEFAULT_SHORTCUTS, ...settings?.shortcuts },
  };
}

export type RecordData = Awaited<ReturnType<typeof recordData>>;
