"use server";

import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

// The typed name goes back so the field survives React's form reset after an action.
export type LoginState = { error?: string; username?: string; email?: string };

// Both catch only AuthError: signIn signals success by throwing a redirect, which must propagate.
function passwordErrorMessage(error: AuthError) {
  if (!(error instanceof CredentialsSignin)) return "Sign-in hit a problem on the server. Try again later.";
  return error.code === "locked"
    ? "Too many failed tries for this username. Wait 15 minutes, then try again."
    : "That username and password don't match.";
}

export async function signInWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  try {
    // No redirect from Auth.js: it would build an absolute URL from the request's host, which behind a
    // tunnel is the dev server's own address. A relative redirect keeps the address bar's host.
    await signIn("credentials", { username: form.get("username"), password: form.get("password"), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: passwordErrorMessage(error), username: String(form.get("username") ?? "") };
    }
    throw error;
  }
  redirect("/");
}

export async function sendMagicLink(_: LoginState, form: FormData): Promise<LoginState> {
  try {
    await signIn("nodemailer", { email: form.get("email"), redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "The link couldn't be sent. Check the address and try again, or use your password.",
        email: String(form.get("email") ?? ""),
      };
    }
    throw error;
  }
  return {};
}
