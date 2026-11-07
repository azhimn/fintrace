import { z } from "zod";
import { db } from "@/lib/db";
import { seedUser } from "@/lib/db/seed";
import { hashPassword } from "@/lib/password";

const env = z
  .object({ SEED_EMAIL: z.email(), SEED_PASSWORD: z.string().min(8).max(128) })
  .safeParse(process.env);
if (!env.success) {
  console.error("Set SEED_EMAIL and SEED_PASSWORD (8 to 128 characters) in .env, recreate the app container with `docker compose up -d app`, then run this again.");
  process.exit(1);
}

const email = env.data.SEED_EMAIL.toLowerCase();
const { seeded } = await seedUser(db, email, await hashPassword(env.data.SEED_PASSWORD));
console.log(seeded ? `Seeded ${email}.` : `${email} is already seeded. Nothing changed.`);
await db.$client.end();
