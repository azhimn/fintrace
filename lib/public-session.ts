import type { Session, User } from "next-auth";

/**
 * What /api/auth/session may send to a browser. With database sessions Auth.js hands the session
 * callback the whole row and user, password hash included, and returns whatever it gets back.
 */
export function publicSession(session: Pick<Session, "expires">, user: Pick<User, "id" | "email" | "name">) {
  return { expires: session.expires, user: { id: user.id, email: user.email, name: user.name } };
}
