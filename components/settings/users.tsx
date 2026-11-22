"use client";

import { useState } from "react";
import { addUser, changeOwnPassword, removeUser, renameSelf, setUsername, setUserPassword } from "@/app/(app)/actions";
import { fieldClass, RowMenu, SwitchRow, useAction } from "@/components/shell/action";
import { Button } from "@/components/ui/button";

export type ManagedUser = { id: string; username: string; email: string | null; isAdmin: boolean };

const sr = "sr-only";

/** Admin only: every login, with adding, password resets and deleting anyone but yourself. */
export function UserSettings({ users, selfId }: { users: ManagedUser[]; selfId: string }) {
  return (
    <ul className="rounded-panel bg-panel">
      {users.map((u) => (
        <UserRow key={u.id} user={u} self={u.id === selfId} />
      ))}
      <li>
        <AddUser />
      </li>
    </ul>
  );
}

function UserRow({ user, self }: { user: ManagedUser; self: boolean }) {
  const { run, pending, alert } = useAction();
  const [mode, setMode] = useState<"username" | "password" | "delete" | null>(null);
  const close = () => setMode(null);
  return (
    <li className="border-t border-divider px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem]">
            {user.username}
            {self && <span className="text-muted-foreground"> (you)</span>}
          </span>
          <span className="mt-px block truncate text-xs text-muted-foreground">
            {[user.isAdmin && "Admin", user.email].filter(Boolean).join(" · ") || "Member"}
          </span>
        </span>
        <RowMenu
          label={`Actions for ${user.username}`}
          actions={[
            { label: "Change username", onClick: () => setMode("username") },
            { label: "Change password", onClick: () => setMode("password") },
            ...(self ? [] : [{ label: "Delete", destructive: true, onClick: () => setMode("delete") }]),
          ]}
        />
      </div>
      {mode === "username" && (
        <div className="mt-3">
          <UsernameForm value={user.username} save={(name) => setUsername(user.id, name)} onDone={close} onCancel={close} />
        </div>
      )}
      {mode === "password" && (
        <div className="mt-3">
          <PasswordForm
            label={`New password for ${user.username}`}
            save={(_, next) => setUserPassword(user.id, next)}
            done={`New password set for ${user.username}`}
            onDone={close}
            onCancel={close}
          />
        </div>
      )}
      {mode === "delete" && (
        <div role="alert" className="mt-3 flex flex-col gap-3 rounded-panel bg-secondary/45 p-4">
          <p className="text-[0.9375rem]">
            Delete {user.username} and all their records, plans and settings? You can&apos;t undo this.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => removeUser(user.id), `Deleted ${user.username}`)}
              className="text-[0.9375rem]"
            >
              Delete
            </Button>
            <Button size="lg" variant="ghost" disabled={pending} onClick={close} className="text-[0.9375rem]">
              Keep
            </Button>
          </div>
        </div>
      )}
      {alert && <div className="mt-2">{alert}</div>}
    </li>
  );
}

/** Everyone's own login: rename, and a password change that asks for the current one. */
export function AccountSettings({ username }: { username: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-panel bg-panel p-4">
      <UsernameForm value={username} save={renameSelf} />
      <PasswordForm label="New password" current save={changeOwnPassword} done="Password changed" />
    </div>
  );
}

function UsernameForm({
  value,
  save,
  onDone,
  onCancel,
}: {
  value: string;
  save: (username: string) => Promise<string | null>;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(value);
  const { run, pending, alert } = useAction();
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => save(name), `Username is now ${name.trim().toLowerCase()}`, onDone);
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap gap-2">
        <label className="min-w-40 flex-1">
          <span className={sr}>Username</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={fieldClass}
          />
        </label>
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-11 text-[0.9375rem]">
          Save
        </Button>
        {onCancel && (
          <Button type="button" size="lg" variant="ghost" onClick={onCancel} className="h-11 text-[0.9375rem]">
            Cancel
          </Button>
        )}
      </div>
      {alert}
    </form>
  );
}

function PasswordForm({
  label,
  current,
  save,
  done,
  onDone,
  onCancel,
}: {
  label: string;
  /** Ask for the current password too: a user changing their own. */
  current?: boolean;
  save: (current: string, next: string) => Promise<string | null>;
  done: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const blank = { current: "", next: "" };
  const [form, setForm] = useState(blank);
  const { run, pending, alert } = useAction();
  const input = (key: keyof typeof blank, text: string, autoComplete: string) => (
    <label className="min-w-40 flex-1">
      <span className={sr}>{text}</span>
      <input
        type="password"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={text}
        autoComplete={autoComplete}
        className={fieldClass}
      />
    </label>
  );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => save(form.current, form.next), done, () => {
          setForm(blank);
          onDone?.();
        });
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex flex-wrap gap-2">
        {current && input("current", "Current password", "current-password")}
        {input("next", label, "new-password")}
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-11 text-[0.9375rem]">
          {current ? "Change" : "Save"}
        </Button>
        {onCancel && (
          <Button type="button" size="lg" variant="ghost" onClick={onCancel} className="h-11 text-[0.9375rem]">
            Cancel
          </Button>
        )}
      </div>
      {alert}
    </form>
  );
}

function AddUser() {
  const blank = { username: "", password: "", email: "", isAdmin: false };
  const [form, setForm] = useState(blank);
  const { run, pending, alert } = useAction();
  const field = (key: "username" | "password" | "email", label: string, type: string, autoComplete: string) => (
    <label className="min-w-40 flex-1">
      <span className={sr}>{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={label}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        className={fieldClass}
      />
    </label>
  );
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addUser(form), `Added ${form.username.trim().toLowerCase()}`, () => setForm(blank));
      }}
      className="flex flex-col gap-3 border-t border-divider px-4 py-3"
    >
      <div className="flex flex-wrap gap-2">
        {field("username", "New username", "text", "off")}
        {field("password", "Password", "password", "new-password")}
      </div>
      {field("email", "Email for sign-in links (optional)", "email", "off")}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SwitchRow checked={form.isAdmin} onChange={(isAdmin) => setForm({ ...form, isAdmin })}>
          <span className="mr-3">Admin</span>
        </SwitchRow>
        <Button type="submit" size="lg" variant="secondary" disabled={pending} className="h-11 text-[0.9375rem]">
          Add user
        </Button>
      </div>
      {alert}
    </form>
  );
}
