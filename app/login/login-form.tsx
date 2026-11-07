"use client";

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
    <div className="flex flex-col gap-8">
      <form action={passwordAction} className="flex flex-col gap-4">
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
            className="h-11 bg-background"
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
            className="h-11 bg-background"
          />
        </div>
        <FieldError id={passwordError} message={password.error} />
        <Button type="submit" disabled={signingIn} className="h-11 text-base">
          {signingIn ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {magicLink && (
        <form action={linkAction} className="flex flex-col gap-3 border-t border-border pt-6">
          <Label htmlFor={`${id}-link-email`}>No password handy? Get a sign-in link by email.</Label>
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
              className="h-11 bg-background"
            />
            <Button type="submit" variant="outline" disabled={sending} className="h-11">
              {sending ? "Sending…" : "Send link"}
            </Button>
          </div>
          <FieldError id={linkError} message={link.error} />
        </form>
      )}
    </div>
  );
}
