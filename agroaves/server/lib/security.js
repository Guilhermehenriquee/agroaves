import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function createSalt() {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString("hex");
}

export function verifyPassword(password, salt, expectedHash) {
  const hashed = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (hashed.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(hashed, expected);
}

export function createSessionToken() {
  return randomBytes(24).toString("hex");
}
