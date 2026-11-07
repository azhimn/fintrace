import { signOut } from "@/auth";
import { RecordProvider } from "@/components/record/record-provider";
import { recordData } from "@/lib/record-data";
import { getDal, requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const data = await recordData(await getDal());

  return (
    <RecordProvider data={data}>
      <div className="flex min-h-dvh flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 pt-8 pb-28 text-sm text-muted-foreground lg:px-8 lg:pb-10">
          <span className="min-w-0 truncate">{user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="-mr-3 h-11 rounded-button px-3 hover:bg-accent hover:text-foreground">
              Sign out
            </button>
          </form>
        </footer>
      </div>
    </RecordProvider>
  );
}
