import { z } from "zod";
import { db } from "@/lib/db";
import { seedUser } from "@/lib/db/seed";
import { hashPassword } from "@/lib/password";
import { username } from "@/lib/users";

const env = z
  .object({ SEED_USERNAME: username, SEED_PASSWORD: z.string().min(8).max(128) })
  .safeParse(process.env);
if (!env.success) {
  console.error("Set SEED_USERNAME (3 to 32 letters, digits, dots, dashes or underscores) and SEED_PASSWORD (8 to 128 characters) in .env, recreate the app container with `docker compose up -d app`, then run this again.");
  process.exit(1);
}

const name = env.data.SEED_USERNAME;
const { seeded } = await seedUser(db, name, await hashPassword(env.data.SEED_PASSWORD), { isAdmin: true });
console.log(seeded ? `Seeded ${name}.` : `${name} is already seeded. Nothing changed.`);
await db.$client.end();
