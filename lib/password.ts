import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// OWASP's scrypt baseline: N=2^17, r=8, p=1.
const N = 2 ** 17;
const KEY_LENGTH = 32;

function derive(password: string, salt: Buffer, cost: number) {
  const options: ScryptOptions = { N: cost, r: 8, p: 1, maxmem: 256 * cost * 8 };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N);
  return `scrypt:${N}:${salt.toString("base64")}:${key.toString("base64")}`;
}

/** Pass null for an unknown user: the hash work still runs, so timing does not reveal who exists. */
export async function verifyPassword(password: string, stored: string | null) {
  const [scheme, cost, salt, key] = stored?.split(":") ?? [];
  if (scheme !== "scrypt") {
    await derive(password, randomBytes(16), N);
    return false;
  }
  const expected = Buffer.from(key, "base64");
  return timingSafeEqual(await derive(password, Buffer.from(salt, "base64"), Number(cost)), expected);
}
