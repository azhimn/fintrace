import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, magicLinkEnabled } from "@/auth";
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
  const message = typeof error === "string" ? (ERRORS[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-kraft pt-[max(env(safe-area-inset-top),3rem)] sm:pt-16">
        <div className="mx-auto w-full max-w-sm px-5 pb-6">
          <span className="text-base font-semibold">fintrace</span>
          <h1 className="mt-10 text-[1.75rem] leading-tight font-medium">Sign in</h1>
        </div>
      </header>
      <div className="flap" aria-hidden />

      <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-5 pt-6 pb-10">
        {sent ? (
          <p role="status" className="rounded-panel bg-panel p-4">
            Check your email. If that address has an account, a sign-in link is on its way.
          </p>
        ) : (
          <>
            {message && (
              <p role="alert" className="rounded-panel bg-destructive-soft/50 p-4 text-sm text-destructive">
                {message}
              </p>
            )}
            <LoginForm magicLink={magicLinkEnabled} />
          </>
        )}
      </main>
    </div>
  );
}
