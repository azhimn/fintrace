"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

// email goes back so the field survives React's form reset after an action.
export type LoginState = { error?: string; email?: string };

// Both catch only AuthError: signIn signals success by throwing a redirect, which must propagate.
function passwordErrorMessage(error: AuthError) {
  if (!(error instanceof CredentialsSignin)) return "Sign-in hit a problem on the server. Try again later.";
  return error.code === "locked"
    ? "Too many failed tries for this email. Wait 15 minutes, then try again."
    : "That email and password don't match.";
}

export async function signInWithPassword(_: LoginState, form: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: passwordErrorMessage(error), email: String(form.get("email") ?? "") };
    }
    throw error;
  }
  return {};
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
