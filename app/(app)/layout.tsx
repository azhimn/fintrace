import { signOut } from "@/auth";
import { RecordBar } from "@/components/overview/record-bar";
import { RecordProvider } from "@/components/record/record-provider";
import { Sidebar } from "@/components/shell/nav";
import { PageTransition } from "@/components/shell/page-transition";
import { recordData } from "@/lib/record-data";
import { getDal, requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const data = await recordData(await getDal());

  return (
    <RecordProvider data={data}>
      <div className="lg:flex">
        <Sidebar
          username={user.username ?? ""}
          signOut={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        />
        <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
          {/* Bottom room so the floating record button never covers the last row. */}
          <div className="flex-1 pb-30">
            <PageTransition>{children}</PageTransition>
          </div>
          <RecordBar placement="float" />
        </div>
      </div>
    </RecordProvider>
  );
}
