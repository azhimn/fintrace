import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { scopedTo } from "./dal";
import { db } from "./db";

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, email: session.user.email };
});

/** The only way server components and actions should reach user data. */
export async function getDal() {
  return scopedTo(db, (await requireUser()).id);
}
