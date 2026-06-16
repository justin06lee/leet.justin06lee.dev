import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.TURSO_DB_URL!,
  authToken: process.env.TURSO_DB_AUTH_TOKEN || undefined,
});

// Memoize so initDb() costs ~0 after the first call in a worker process.
let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      github_id INTEGER NOT NULL,
      github_login TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      email TEXT,
      tier TEXT NOT NULL DEFAULT 'free',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      ip TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      first_attempt INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY, slug TEXT, title TEXT, pattern TEXT, body TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`,
    `CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY, slug TEXT, title TEXT, statement TEXT, pattern TEXT,
      difficulty TEXT NOT NULL DEFAULT 'medium',
      judging_mode TEXT NOT NULL DEFAULT 'function',
      function_name TEXT, params TEXT, return_type TEXT, starter_code TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug)`,
    `CREATE TABLE IF NOT EXISTS problem_tests (
      id TEXT PRIMARY KEY, problem_id TEXT NOT NULL,
      ordinal INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT 'visible',
      input TEXT, expected TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_problem_tests_problem ON problem_tests(problem_id, ordinal)`,
  ]);
}
