import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { scopedTo } from "./dal";
import { db } from "./db";

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id, username, isAdmin } = session.user;
  return { id, username, isAdmin: !!isAdmin };
});

/** For user management: anyone else gets null. The session re-reads the user row on every request. */
export async function requireAdmin() {
  const user = await requireUser();
  return user.isAdmin ? user : null;
}

/** The only way server components and actions should reach user data. */
export async function getDal() {
  return scopedTo(db, (await requireUser()).id);
}
