import type { Metadata } from "next";
import { FundSettings } from "@/components/settings/lists";
import { Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { getDal } from "@/lib/session";

export const metadata: Metadata = { title: "Funds · Settings" };

export default async function FundsSettingsPage() {
  const accounts = await (await getDal()).accounts();

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Funds</h1>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <Section title="Your Funds">
          <FundSettings
            funds={accounts.map(({ id, name, kind, minBalance, countsAsUsable, archived, icon, hue }) => ({
              id,
              name,
              kind,
              minBalance,
              countsAsUsable,
              archived,
              icon,
              hue,
            }))}
          />
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            Usable funds add up the Funds marked usable, minus what each keeps as a minimum.
          </p>
        </Section>
      </main>
    </>
  );
}
