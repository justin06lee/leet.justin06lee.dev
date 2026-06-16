import { randomUUID } from "crypto";
import type { Row } from "@libsql/client";
import { db, initDb } from "./db";
import type { Tier } from "./tiers";

export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// The user as stored. `tier` here is the persisted tier ("free" | "paid").
// The effective tier (including derived "owner") is computed by auth-server.
export interface User {
  id: string;
  githubId: number;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
  tier: Tier;
  createdAt: string;
}

export function mapUserRow(row: Row): User {
  return {
    id: row.id as string,
    githubId: Number(row.github_id),
    githubLogin: row.github_login as string,
    name: (row.name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    tier: row.tier as Tier,
    createdAt: row.created_at as string,
  };
}

export async function upsertGitHubUser(profile: GitHubProfile): Promise<User> {
  await initDb();
  const id = randomUUID();
  // Insert-or-update by github_id. ON CONFLICT refreshes mutable profile fields
  // and updated_at, but never touches `tier` (preserves a manual paid grant).
  await db.execute({
    sql: `INSERT INTO users (id, github_id, github_login, name, avatar_url, email)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(github_id) DO UPDATE SET
            github_login = excluded.github_login,
            name = excluded.name,
            avatar_url = excluded.avatar_url,
            email = excluded.email,
            updated_at = datetime('now')`,
    args: [id, profile.id, profile.login, profile.name, profile.avatar_url, profile.email],
  });
  const res = await db.execute({
    sql: "SELECT * FROM users WHERE github_id = ?",
    args: [profile.id],
  });
  return mapUserRow(res.rows[0]);
}

export async function getUserById(id: string): Promise<User | null> {
  await initDb();
  const res = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return null;
  return mapUserRow(res.rows[0]);
}
