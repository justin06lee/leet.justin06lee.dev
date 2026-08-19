import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time compare of two secrets of unrelated length.
 *
 * `timingSafeEqual` throws unless the buffers match in length, and padding to
 * compare would leak the length through the exception. Hashing both sides
 * first makes every comparison 32 bytes regardless of what was typed.
 * (Same pattern as the sibling sites' lib/auth.ts.)
 */
export function secretEquals(a: string, b: string | undefined): boolean {
  if (!b) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** True when `password` matches ADMIN_KEY. False when ADMIN_KEY is unset. */
export function verifyAdminKey(password: unknown): boolean {
  if (typeof password !== "string") return false;
  return secretEquals(password, process.env.ADMIN_KEY);
}
