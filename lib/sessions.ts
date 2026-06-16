import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import { mapUserRow, type User } from "./users";

export const SESSION_COOKIE_NAME = "leet_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

export function isExpired(expiresAtIso: string, nowMs: number): boolean {
  return Date.parse(expiresAtIso) <= nowMs;
}

export async function createSession(userId: string): Promise<string> {
  await initDb();
  // Opportunistically prune expired sessions so the table doesn't grow forever.
  await db.execute({ sql: "DELETE FROM sessions WHERE expires_at < datetime('now')", args: [] });
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO sessions (id, user_id, created_at, expires_at)
          VALUES (?, ?, datetime('now'), datetime('now', ?))`,
    args: [id, userId, `+${SESSION_TTL_SECONDS} seconds`],
  });
  return id;
}

// Resolve a session token to its user. Lazily deletes the row if expired.
export async function getSessionUser(token: string): Promise<User | null> {
  await initDb();
  const res = await db.execute({
    sql: `SELECT u.*, s.expires_at AS session_expires_at
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ?`,
    args: [token],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  if (isExpired(row.session_expires_at as string, Date.now())) {
    await destroySession(token);
    return null;
  }
  return mapUserRow(row);
}

export async function destroySession(token: string): Promise<void> {
  await initDb();
  await db.execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [token] });
}
