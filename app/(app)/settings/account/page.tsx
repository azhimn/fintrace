import type { Metadata } from "next";
import { RecordBar } from "@/components/overview/record-bar";
import { AccountSettings, UserSettings } from "@/components/settings/users";
import { Band } from "@/components/shell/band";
import { Section } from "@/components/shell/bits";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/session";
import { listUsers } from "@/lib/users";

export const metadata: Metadata = { title: "Account · Settings" };

export default async function AccountSettingsPage() {
  const me = await requireUser();
  const admin = await requireAdmin();
  const users = admin ? await listUsers(db) : null;

  return (
    <>
      <Band>
        <h1 className="mt-3 text-[1.375rem] font-medium">Account</h1>
      </Band>

      <main className="mx-auto max-w-5xl px-5 lg:px-8">
        <RecordBar placement="page" />
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          <Section title="Your login">
            <AccountSettings username={me.username ?? ""} />
          </Section>
          {admin && users && (
            <Section title="Users">
              <UserSettings users={users} selfId={admin.id} />
              <p className="mt-2 px-1 text-sm text-muted-foreground">
                Each user gets their own Funds, Budgets and Categories. Only admins see this list.
              </p>
            </Section>
          )}
        </div>
      </main>
    </>
  );
}
