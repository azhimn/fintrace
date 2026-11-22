import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { CategorySettings } from "@/components/settings/lists";
import { Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { envelopeHue } from "@/lib/hue";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Categories · Settings" };

export default async function CategoriesSettingsPage() {
  const dal = await getDal();
  const [envelopes, categories, subcategories] = await Promise.all([dal.envelopes(), dal.categories(), dal.subcategories()]);

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Categories</h1>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <Section title="Your Categories">
          <CategorySettings
            budgets={envelopes.map((e) => ({ id: e.id, name: e.name, isSystem: e.isSystem, hue: envelopeHue(e) }))}
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
      </main>
    </>
  );
}
