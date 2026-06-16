import { NextRequest } from "next/server";
import { db, initDb } from "./db";

// Prefer x-real-ip (set by the proxy, not client-forwarded). Fall back to the
// rightmost x-forwarded-for hop (nearest to us, not the spoofable leftmost).
export function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}

const RATE_WINDOW = 15 * 60 * 1000; // 15 min rolling window
const MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW = 24 * 60 * 60 * 1000; // 24h lockout once tripped

// Atomic read-modify-write upsert so concurrent attempts from one IP can't both
// read the same count and clobber the increment. Returns true if still allowed.
export async function checkRateLimit(ip: string): Promise<boolean> {
  await initDb();
  const now = Date.now();
  const windowStart = now - RATE_WINDOW;
  const lockoutStart = now - LOCKOUT_WINDOW;

  await db.execute({
    sql: "DELETE FROM login_attempts WHERE first_attempt < ?",
    args: [lockoutStart],
  });

  const result = await db.execute({
    sql: `INSERT INTO login_attempts (ip, count, first_attempt) VALUES (?, 1, ?)
          ON CONFLICT(ip) DO UPDATE SET
            count = CASE
              WHEN login_attempts.count > ? AND login_attempts.first_attempt >= ? THEN login_attempts.count
              WHEN login_attempts.first_attempt < ? THEN 1
              ELSE login_attempts.count + 1 END,
            first_attempt = CASE
              WHEN login_attempts.count > ? AND login_attempts.first_attempt >= ? THEN login_attempts.first_attempt
              WHEN login_attempts.first_attempt < ? THEN ?
              ELSE login_attempts.first_attempt END
          RETURNING count`,
    args: [ip, now, MAX_ATTEMPTS, lockoutStart, windowStart, MAX_ATTEMPTS, lockoutStart, windowStart, now],
  });
  const count = Number((result.rows[0] as unknown as { count: number }).count);
  return count <= MAX_ATTEMPTS;
}
