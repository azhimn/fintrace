"use client";

import { SignInIcon } from "@phosphor-icons/react";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, signInWithPassword } from "./actions";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function LoginForm({ magicLink }: { magicLink: boolean }) {
  const [password, passwordAction, signingIn] = useActionState(signInWithPassword, {});
  const [link, linkAction, sending] = useActionState(sendMagicLink, {});
  const id = useId();
  const passwordError = `${id}-password-error`;
  const linkError = `${id}-link-error`;

  return (
    <div className="flex flex-col gap-3">
      <form action={passwordAction} className="flex flex-col gap-3 rounded-panel bg-panel p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            defaultValue={password.email}
            required
            autoComplete="username"
            autoFocus
           
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-password`}>Password</Label>
          <Input
            id={`${id}-password`}
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={!!password.error}
            aria-describedby={password.error ? passwordError : undefined}
           
          />
        </div>
        <FieldError id={passwordError} message={password.error} />
        <Button type="submit" size="lg" disabled={signingIn}>
          <SignInIcon weight="fill" aria-hidden className="size-5" />
          {signingIn ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {magicLink && (
        <form action={linkAction} className="flex flex-col gap-3 rounded-panel bg-panel p-4">
          <Label htmlFor={`${id}-link-email`} className="leading-snug">No password handy? Get a sign-in link by email.</Label>
          <div className="flex gap-2">
            <Input
              id={`${id}-link-email`}
              name="email"
              type="email"
              defaultValue={link.email}
              required
              autoComplete="username"
              aria-invalid={!!link.error}
              aria-describedby={link.error ? linkError : undefined}
             
            />
            <Button type="submit" variant="secondary" disabled={sending} className="h-11 px-4">
              {sending ? "Sending…" : "Send link"}
            </Button>
          </div>
          <FieldError id={linkError} message={link.error} />
        </form>
      )}
    </div>
  );
}
