import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Nodemailer from "next-auth/providers/nodemailer";
import { z } from "zod";
import { db } from "@/lib/db";
import { authAccounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { clearFailures, isLocked, recordFailure } from "@/lib/login-throttle";
import { verifyPassword } from "@/lib/password";
import { publicSession } from "@/lib/public-session";

// Auth.js reads AUTH_URL; fintrace's single configured origin is APP_URL (SPEC section 1).
process.env.AUTH_URL ??= process.env.APP_URL;

class LoginLocked extends CredentialsSignin {
  code = "locked";
}

export const magicLinkEnabled = !!process.env.SMTP_HOST;

const credentials = z.object({ email: z.email(), password: z.string().min(1).max(128) });

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: authAccounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/login", verifyRequest: "/login?sent=1" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(input) {
        const parsed = credentials.safeParse(input);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        if (isLocked(email)) throw new LoginLocked();

        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!(await verifyPassword(parsed.data.password, user?.passwordHash ?? null))) {
          recordFailure(email);
          return null;
        }
        clearFailures(email);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Stays registered without SMTP: Auth.js rejects database sessions when Credentials is the only provider.
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST ?? "localhost",
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASS ?? "" },
      },
      from: process.env.SMTP_FROM,
    }),
  ],
  jwt: {
    // Auth.js writes this return value to the session cookie after a Credentials sign-in. With a
    // database strategy it is read back as a session token, so create that row here. Magic link
    // sessions take the adapter path and never reach this.
    async encode({ token, maxAge = 30 * 24 * 60 * 60 }) {
      if (!token?.sub) throw new Error("Credentials sign-in returned no user id");
      const sessionToken = crypto.randomUUID();
      await db.insert(sessions).values({
        sessionToken,
        userId: token.sub,
        expires: new Date(Date.now() + maxAge * 1000),
      });
      return sessionToken;
    },
  },
  callbacks: {
    async signIn({ account, user, email }) {
      if (account?.provider !== "nodemailer") return true;
      if (!magicLinkEnabled || !user.email) return false;
      // No self-signup. Unknown addresses see the same "check your email" screen as known ones.
      const [known] = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email.toLowerCase()));
      return known ? true : email?.verificationRequest ? "/login?sent=1" : false;
    },
    session: ({ session, user }) => publicSession(session, user) as typeof session,
    authorized: ({ auth }) => !!auth,
  },
});
