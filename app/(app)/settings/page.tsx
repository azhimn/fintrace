import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { PayDayWindow, ShortcutEditor } from "@/components/settings/preferences";
import { ThemeChoice } from "@/components/theme";
import { AddressWindow, Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { getDal } from "@/lib/session";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await (await getDal()).settings();

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
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          <Section title="Theme">
            <ThemeChoice />
          </Section>
          <Section title="Keyboard shortcuts">
            <ShortcutEditor saved={{ ...DEFAULT_SHORTCUTS, ...settings?.shortcuts }} />
          </Section>
        </div>
      </main>
    </>
  );
}
