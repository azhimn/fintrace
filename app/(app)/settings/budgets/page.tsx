import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { BudgetSettings } from "@/components/settings/lists";
import { Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { envelopeHue } from "@/lib/hue";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Budgets · Settings" };

export default async function BudgetsSettingsPage() {
  const envelopes = await (await getDal()).envelopes();

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Budgets</h1>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Section title="Your Budgets">
          <BudgetSettings budgets={envelopes.map((e) => ({ id: e.id, name: e.name, isSystem: e.isSystem, hue: envelopeHue(e) }))} />
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            Each Budget keeps its colour when you move it. One with records stays; rename it instead.
          </p>
        </Section>
      </main>
    </>
  );
}
