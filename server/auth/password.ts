import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;
const saltLength = 16;
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(saltLength).toString("hex");
  const derivedKey = Buffer.from(await scrypt(password, salt, keyLength));

  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, storedKeyHex] = passwordHash.split("$");

  if (
    algorithm !== "scrypt"
    || !salt
    || !storedKeyHex
    || !/^[a-f0-9]{32}$/i.test(salt)
    || !/^[a-f0-9]{128}$/i.test(storedKeyHex)
  ) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, "hex");
  const derivedKey = Buffer.from(await scrypt(password, salt, keyLength));

  return timingSafeEqual(storedKey, derivedKey);
}
