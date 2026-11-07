import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, magicLinkEnabled } from "@/auth";
import { DayNumeral } from "@/components/day-numeral";
import { MonthGrid } from "@/components/month-grid";
import { monthSheet } from "@/lib/calendar";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  AccessDenied: "That account can't sign in here.",
  Configuration: "Sign-in hit a problem on the server. Try your password, or try again later.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if ((await auth())?.user) redirect("/");

  const { sent, error } = await searchParams;
  const sheet = monthSheet();
  const message = typeof error === "string" ? (ERRORS[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center bg-primary px-6 text-primary-foreground lg:px-12">
        <span className="wordmark">fintrace</span>
      </header>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <aside className="hidden flex-col gap-6 px-12 py-12 lg:flex">
          <DayNumeral sheet={sheet} large />
          <MonthGrid sheet={sheet} />
        </aside>

        <main className="flex flex-col gap-8 px-6 py-8 lg:border-l lg:border-border lg:bg-muted lg:px-12 lg:py-12">
          <DayNumeral sheet={sheet} large className="lg:hidden" />
          <h1 className="text-2xl font-semibold">Sign in</h1>
          {sent ? (
            <p role="status" className="text-base">
              Check your email. If that address has an account, a sign-in link is on its way.
            </p>
          ) : (
            <>
              {message && (
                <p role="alert" className="text-sm text-destructive">
                  {message}
                </p>
              )}
              <LoginForm magicLink={magicLinkEnabled} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
