import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { BudgetSettings, CategorySettings, FundSettings } from "@/components/settings/lists";
import { PayDayWindow, ShortcutEditor } from "@/components/settings/preferences";
import { AddressWindow, Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { envelopeHue } from "@/lib/hue";
import { getDal } from "@/lib/session";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const dal = await getDal();
  const [accounts, envelopes, categories, subcategories, settings] = await Promise.all([
    dal.accounts(),
    dal.envelopes(),
    dal.categories(),
    dal.subcategories(),
    dal.settings(),
  ]);
  const budgets = envelopes.map((e) => ({ id: e.id, name: e.name, isSystem: e.isSystem, hue: envelopeHue(e) }));

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Settings</h1>
        <AddressWindow label="Default pay day">
          <PayDayWindow payDay={settings?.defaultPayDay ?? 25} />
        </AddressWindow>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <Section title="Funds">
              <FundSettings
                funds={accounts.map(({ id, name, kind, minBalance, countsAsUsable, archived }) => ({
                  id,
                  name,
                  kind,
                  minBalance,
                  countsAsUsable,
                  archived,
                }))}
              />
              <p className="mt-2 px-1 text-sm text-muted-foreground">
                Usable funds add up the Funds marked usable, minus what each keeps as a minimum.
              </p>
            </Section>
            <Section title="Keyboard shortcuts">
              <ShortcutEditor saved={{ ...DEFAULT_SHORTCUTS, ...settings?.shortcuts }} />
            </Section>
          </div>
          <div>
            <Section title="Budgets">
              <BudgetSettings budgets={budgets} />
              <p className="mt-2 px-1 text-sm text-muted-foreground">
                Each Budget keeps its colour when you move it. One with records stays; rename it instead.
              </p>
            </Section>
            <Section title="Categories">
              <CategorySettings
                budgets={budgets}
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  kind: c.kind,
                  archived: c.archived,
                  subs: subcategories
                    .filter((s) => s.categoryId === c.id)
                    .map(({ id, name, defaultClassification, defaultEnvelopeId }) => ({ id, name, defaultClassification, defaultEnvelopeId })),
                }))}
              />
              <p className="mt-2 px-1 text-sm text-muted-foreground">
                A subcategory&apos;s default Budget and Needs or Wants fill in when you record with it.
              </p>
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
