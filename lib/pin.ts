import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/** "<saltHex>:<hashHex>" using scrypt. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
