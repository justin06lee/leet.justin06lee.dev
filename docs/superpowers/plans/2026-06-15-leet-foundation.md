# Foundation (auth, tiers, shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A user can sign in with GitHub, receive a DB-backed session, and land on a `/dashboard` showing their login and access tier; the owner is auto-resolved to `owner`; reusable auth/tier helpers exist for later slices.

**Architecture:** Next.js 16 App Router. Turso/libSQL with raw SQL bootstrapped by an idempotent `initDb()`. Hand-rolled GitHub OAuth web flow with a DB-backed session table + httpOnly cookie (mirrors the sibling `justin06lee.dev`). Access tier is stored as `free`/`paid` and the `owner` tier is **derived at read time** from `OWNER_GITHUB_LOGIN` (never stored, so it survives DB resets and can't be self-assigned). Pure logic (tier resolution, session expiry, OAuth state, authorize-URL building) is isolated into small modules and unit-tested; DB-touching functions are integration-tested against an in-memory libSQL instance.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript 5, Tailwind 4, `@libsql/client`, Vitest. Package manager: **bun**. Node `crypto` for `randomUUID`/`timingSafeEqual`.

**Spec:** `docs/superpowers/specs/2026-06-15-leet-foundation-design.md`. Vision: `docs/superpowers/specs/2026-06-15-leet-platform-vision.md`.

**Reference (read before coding):**
- Next.js 16 is newer than your training data. Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`. Key facts already confirmed: route handlers export `GET`/`POST` etc. taking a `Request`/`NextRequest`; `cookies()` from `next/headers` is **async** (`await cookies()`); route handlers are not cached by default.
- Pattern source for auth/session/rate-limit/headers: the sibling repo at `../justin06lee.dev` (`src/lib/auth.ts`, `src/lib/db.ts`, `src/app/api/auth/route.ts`, `next.config.ts`). Note: that repo uses env names `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` and cookie `admin_session`; **this** project uses `TURSO_DB_URL`/`TURSO_DB_AUTH_TOKEN` and cookie `leet_session`. Do not copy the env names.

---

## File Structure

**Create:**
- `lib/tiers.ts` — `Tier` type + pure tier logic (`resolveTier`, `canUseServerJudge`, `canSeeHiddenTests`)
- `lib/db.ts` — libSQL client + idempotent `initDb()` (tables: `users`, `sessions`, `login_attempts`)
- `lib/users.ts` — `upsertGitHubUser`, `getUserById`, the `User`/`GitHubProfile` types, row mapping
- `lib/sessions.ts` — session store (`createSession`, `getSessionUser`, `destroySession`), `isExpired` pure helper, cookie name + TTL constants
- `lib/rate-limit.ts` — `getClientIp`, `checkRateLimit`
- `lib/github-oauth.ts` — pure `buildAuthorizeUrl`, `generateState`, `verifyState`; network `exchangeCodeForToken`, `fetchGitHubProfile`
- `lib/auth-server.ts` — `getCurrentUser`, `requireUser`, `requireOwner` (server-component context via `cookies()`)
- `app/api/auth/github/route.ts` — GET: start OAuth
- `app/api/auth/github/callback/route.ts` — GET: OAuth callback
- `app/api/auth/logout/route.ts` — POST: logout
- `app/dashboard/page.tsx` — the proof page
- `components/Navbar.tsx` — wordmark + sign-in/avatar
- `vitest.config.ts`, `.env.example`
- Test files: `lib/tiers.test.ts`, `lib/db.test.ts`, `lib/sessions.test.ts`, `lib/users.test.ts`, `lib/rate-limit.test.ts`, `lib/github-oauth.test.ts`

**Modify:**
- `package.json` (deps + scripts), `tsconfig.json` (confirm `@/*` alias), `next.config.ts` (headers + serverExternalPackages), `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.env.local`

---

## Task 1: Project setup — deps, scripts, alias, vitest

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Add runtime + dev dependencies**

Run (bun):
```bash
cd /Volumes/T7/Stockpile/Workspace/github.com/justin06lee/leet.justin06lee.dev
bun add @libsql/client@^0.17.0
bun add -d vitest@^4.1.5
```
Expected: `package.json` gains `@libsql/client` in `dependencies` and `vitest` in `devDependencies`; `bun.lock` updates.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add the two test lines (keep existing `dev`/`build`/`start`/`lint`):
```json
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Confirm the `@/*` path alias maps to the project root**

Open `tsconfig.json`. This project has **no `src/` dir** (code lives in `app/` and `lib/` at the repo root). Ensure `compilerOptions.paths` contains:
```json
    "paths": {
      "@/*": ["./*"]
    }
```
If it already maps to `./src/*`, change it to `./*`. (create-next-app without `src/` defaults to `./*`.)

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // In-memory libSQL DB for integration tests — fresh per test file.
    // db.ts reads these at import time.
    env: {
      TURSO_DB_URL: ":memory:",
      TURSO_DB_AUTH_TOKEN: "",
      OWNER_GITHUB_LOGIN: "justin06lee",
    },
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `.env.example`**

```bash
# Turso / libSQL (already provisioned for this project)
TURSO_DB_URL=
TURSO_DB_AUTH_TOKEN=

# GitHub OAuth app (register at https://github.com/settings/developers)
# Authorization callback URL: https://leet.justin06lee.dev/api/auth/github/callback
# (add a second OAuth app or callback for http://localhost:3000/api/auth/github/callback in dev)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Master admin key (reserved for later admin mutations; compared with timingSafeEqual)
ADMIN_KEY=

# GitHub login that is auto-stamped as the "owner" tier (never billed)
OWNER_GITHUB_LOGIN=justin06lee
```

- [ ] **Step 6: Verify the toolchain runs**

Run:
```bash
bun run test
```
Expected: Vitest starts and reports "No test files found" (or runs 0 tests) — confirms vitest is wired. (It exits 0 / or a "no tests" notice; that's fine for now.)

- [ ] **Step 7: Commit**

```bash
git add package.json bun.lock tsconfig.json vitest.config.ts .env.example
git commit -m "chore: add libsql + vitest, test scripts, env example"
```

---

## Task 2: Tier logic (pure, TDD)

**Files:**
- Create: `lib/tiers.ts`
- Test: `lib/tiers.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/tiers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveTier, canUseServerJudge, canSeeHiddenTests } from "./tiers";

describe("resolveTier", () => {
  it("returns owner when login matches OWNER_GITHUB_LOGIN (case-insensitive)", () => {
    expect(resolveTier("JustIn06Lee", "free", "justin06lee")).toBe("owner");
  });
  it("returns the stored tier for non-owners", () => {
    expect(resolveTier("someone", "free", "justin06lee")).toBe("free");
    expect(resolveTier("someone", "paid", "justin06lee")).toBe("paid");
  });
  it("never resolves owner when ownerLogin is undefined", () => {
    expect(resolveTier("justin06lee", "free", undefined)).toBe("free");
  });
});

describe("tier capability gates", () => {
  it("grants judge + hidden tests to paid and owner only", () => {
    expect(canUseServerJudge("owner")).toBe(true);
    expect(canUseServerJudge("paid")).toBe(true);
    expect(canUseServerJudge("free")).toBe(false);
    expect(canSeeHiddenTests("owner")).toBe(true);
    expect(canSeeHiddenTests("paid")).toBe(true);
    expect(canSeeHiddenTests("free")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/tiers.test.ts`
Expected: FAIL — cannot import from `./tiers` (module not found).

- [ ] **Step 3: Write minimal implementation**

`lib/tiers.ts`:
```ts
// Stored tiers are only "free" | "paid". "owner" is derived at read time from
// OWNER_GITHUB_LOGIN and is never persisted, so it survives DB resets and
// cannot be self-assigned by editing a row.
export type Tier = "owner" | "free" | "paid";

export function resolveTier(
  githubLogin: string,
  storedTier: Tier,
  ownerLogin: string | undefined,
): Tier {
  if (ownerLogin && githubLogin.toLowerCase() === ownerLogin.toLowerCase()) {
    return "owner";
  }
  return storedTier;
}

export function canUseServerJudge(tier: Tier): boolean {
  return tier === "paid" || tier === "owner";
}

export function canSeeHiddenTests(tier: Tier): boolean {
  return tier === "paid" || tier === "owner";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/tiers.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/tiers.ts lib/tiers.test.ts
git commit -m "feat: tier type + pure tier resolution/capability gates"
```

---

## Task 3: Database client + schema bootstrap

**Files:**
- Create: `lib/db.ts`
- Test: `lib/db.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/db.test.ts` (integration — runs against the in-memory DB from `vitest.config.ts`):
```ts
import { describe, it, expect } from "vitest";
import { db, initDb } from "./db";

describe("initDb", () => {
  it("creates users, sessions, and login_attempts tables", async () => {
    await initDb();
    const res = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tables = res.rows.map((r) => r.name as string);
    expect(tables).toContain("users");
    expect(tables).toContain("sessions");
    expect(tables).toContain("login_attempts");
  });

  it("is idempotent (safe to call twice)", async () => {
    await initDb();
    await initDb();
    const res = await db.execute("SELECT COUNT(*) AS n FROM users");
    expect(Number(res.rows[0].n)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/db.test.ts`
Expected: FAIL — cannot import from `./db`.

- [ ] **Step 3: Write minimal implementation**

`lib/db.ts`:
```ts
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
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/db.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/db.test.ts
git commit -m "feat: libsql client + idempotent schema bootstrap (users, sessions, login_attempts)"
```

---

## Task 4: User store (upsert + fetch)

**Files:**
- Create: `lib/users.ts`
- Test: `lib/users.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/users.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { initDb, db } from "./db";
import { upsertGitHubUser, getUserById } from "./users";

const profile = {
  id: 4242,
  login: "octocat",
  name: "The Octocat",
  avatar_url: "https://example.com/a.png",
  email: "octo@example.com",
};

describe("upsertGitHubUser", () => {
  it("inserts a new user with default tier 'free' and returns it", async () => {
    await initDb();
    const user = await upsertGitHubUser(profile);
    expect(user.githubId).toBe(4242);
    expect(user.githubLogin).toBe("octocat");
    expect(user.tier).toBe("free");
    expect(typeof user.id).toBe("string");
  });

  it("updates profile fields on repeat login without creating a second row or resetting tier", async () => {
    await initDb();
    const first = await upsertGitHubUser(profile);
    // Simulate a manual paid grant.
    await db.execute({ sql: "UPDATE users SET tier='paid' WHERE id=?", args: [first.id] });

    const second = await upsertGitHubUser({ ...profile, name: "Mona", login: "octocat" });
    expect(second.id).toBe(first.id); // same row
    expect(second.name).toBe("Mona"); // profile refreshed
    expect(second.tier).toBe("paid"); // manual grant preserved

    const count = await db.execute("SELECT COUNT(*) AS n FROM users");
    expect(Number(count.rows[0].n)).toBe(1);
  });
});

describe("getUserById", () => {
  it("returns null for an unknown id", async () => {
    await initDb();
    expect(await getUserById("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/users.test.ts`
Expected: FAIL — cannot import from `./users`.

- [ ] **Step 3: Write minimal implementation**

`lib/users.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/users.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/users.ts lib/users.test.ts
git commit -m "feat: user store with github upsert that preserves manual tier grants"
```

---

## Task 5: Session store

**Files:**
- Create: `lib/sessions.ts`
- Test: `lib/sessions.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/sessions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { initDb } from "./db";
import { upsertGitHubUser } from "./users";
import { createSession, getSessionUser, destroySession, isExpired, SESSION_COOKIE_NAME } from "./sessions";

const profile = { id: 7, login: "sess", name: null, avatar_url: null, email: null };

describe("isExpired", () => {
  it("is true once now passes expires_at", () => {
    expect(isExpired("2020-01-01T00:00:00.000Z", Date.parse("2020-01-02T00:00:00.000Z"))).toBe(true);
  });
  it("is false before expiry", () => {
    expect(isExpired("2099-01-01T00:00:00.000Z", Date.parse("2020-01-01T00:00:00.000Z"))).toBe(false);
  });
});

describe("session store", () => {
  it("creates a session resolvable back to its user", async () => {
    await initDb();
    const user = await upsertGitHubUser(profile);
    const token = await createSession(user.id);
    expect(typeof token).toBe("string");
    const resolved = await getSessionUser(token);
    expect(resolved?.id).toBe(user.id);
  });

  it("returns null for an unknown token", async () => {
    await initDb();
    expect(await getSessionUser("bogus")).toBeNull();
  });

  it("destroys a session", async () => {
    await initDb();
    const user = await upsertGitHubUser({ ...profile, id: 8, login: "sess8" });
    const token = await createSession(user.id);
    await destroySession(token);
    expect(await getSessionUser(token)).toBeNull();
  });

  it("exports a stable cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("leet_session");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/sessions.test.ts`
Expected: FAIL — cannot import from `./sessions`.

- [ ] **Step 3: Write minimal implementation**

`lib/sessions.ts`:
```ts
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
```

Note: `mapUserRow` ignores the extra `session_expires_at` column, so the joined row maps cleanly to `User`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/sessions.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/sessions.ts lib/sessions.test.ts
git commit -m "feat: db-backed session store with lazy expiry"
```

---

## Task 6: Rate limiter + client IP

**Files:**
- Create: `lib/rate-limit.ts`
- Test: `lib/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/rate-limit.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp, checkRateLimit } from "./rate-limit";

function reqWith(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://leet.justin06lee.dev/api/auth/github", { headers });
}

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  });
  it("falls back to the rightmost x-forwarded-for hop", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "9.9.9.9, 5.6.7.8" }))).toBe("5.6.7.8");
  });
  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(reqWith({}))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows up to the cap then blocks", async () => {
    const ip = "203.0.113.7";
    let lastAllowed = true;
    for (let i = 0; i < 12; i++) lastAllowed = await checkRateLimit(ip);
    expect(lastAllowed).toBe(false); // exceeded 10/window
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/rate-limit.test.ts`
Expected: FAIL — cannot import from `./rate-limit`.

- [ ] **Step 3: Write minimal implementation**

`lib/rate-limit.ts` (adapted from `../justin06lee.dev/src/lib/auth.ts`):
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/rate-limit.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts
git commit -m "feat: db-backed login rate limiter + client ip resolution"
```

---

## Task 7: GitHub OAuth helpers

**Files:**
- Create: `lib/github-oauth.ts`
- Test: `lib/github-oauth.test.ts`

We omit `redirect_uri` from the authorize request and rely on the callback URL registered on the GitHub OAuth app — this avoids proxy/origin mismatches. Scope is `read:user`.

- [ ] **Step 1: Write the failing test**

`lib/github-oauth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildAuthorizeUrl, verifyState, generateState } from "./github-oauth";

describe("buildAuthorizeUrl", () => {
  it("includes client_id, scope, and state", () => {
    const url = new URL(buildAuthorizeUrl("client123", "statexyz"));
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client123");
    expect(url.searchParams.get("scope")).toBe("read:user");
    expect(url.searchParams.get("state")).toBe("statexyz");
  });
});

describe("verifyState", () => {
  it("is true only when both present and equal", () => {
    expect(verifyState("abc", "abc")).toBe(true);
    expect(verifyState("abc", "def")).toBe(false);
    expect(verifyState(undefined, "abc")).toBe(false);
    expect(verifyState("abc", null)).toBe(false);
    expect(verifyState("", "")).toBe(false); // empty is not a valid state
  });
});

describe("generateState", () => {
  it("produces a non-empty unique-ish string", () => {
    expect(generateState().length).toBeGreaterThan(10);
    expect(generateState()).not.toBe(generateState());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test lib/github-oauth.test.ts`
Expected: FAIL — cannot import from `./github-oauth`.

- [ ] **Step 3: Write minimal implementation**

`lib/github-oauth.ts`:
```ts
import { randomUUID } from "crypto";
import type { GitHubProfile } from "./users";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const SCOPE = "read:user";

export function generateState(): string {
  return randomUUID();
}

export function buildAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({ client_id: clientId, scope: SCOPE, state });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function verifyState(
  cookieState: string | undefined,
  queryState: string | null,
): boolean {
  return Boolean(cookieState) && Boolean(queryState) && cookieState === queryState;
}

// Exchange the OAuth code for an access token. Throws on failure.
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`token exchange error: ${data.error ?? "no token"}`);
  return data.access_token;
}

// Fetch the authenticated user's profile. Throws on failure.
export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
  const res = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "leet.justin06lee.dev",
    },
  });
  if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
  const u = (await res.json()) as {
    id: number; login: string; name: string | null;
    avatar_url: string | null; email: string | null;
  };
  return {
    id: u.id, login: u.login, name: u.name ?? null,
    avatar_url: u.avatar_url ?? null, email: u.email ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test lib/github-oauth.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/github-oauth.ts lib/github-oauth.test.ts
git commit -m "feat: github oauth helpers (authorize url, state, token + profile fetch)"
```

---

## Task 8: Server auth helpers (current user + guards)

**Files:**
- Create: `lib/auth-server.ts`
- Test: none (thin wrappers over tested units + `next/headers`; verified via the dashboard and build). The effective-tier overlay logic is exercised through `resolveTier`'s own tests.

- [ ] **Step 1: Write the implementation**

`lib/auth-server.ts`:
```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE_NAME } from "./sessions";
import { resolveTier, type Tier } from "./tiers";
import type { User } from "./users";

// User with the effective tier (owner derived from OWNER_GITHUB_LOGIN).
export interface CurrentUser extends Omit<User, "tier"> {
  tier: Tier;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user) return null;
  return {
    ...user,
    tier: resolveTier(user.githubLogin, user.tier, process.env.OWNER_GITHUB_LOGIN),
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireOwner(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.tier !== "owner") redirect("/");
  return user;
}
```

- [ ] **Step 2: Add the `server-only` dependency**

Run:
```bash
bun add server-only
```
Expected: `server-only` added to `dependencies` (it throws if imported into a client bundle, guarding these helpers).

- [ ] **Step 3: Verify it type-checks via build later** — no unit test here.

- [ ] **Step 4: Commit**

```bash
git add lib/auth-server.ts package.json bun.lock
git commit -m "feat: server auth helpers (getCurrentUser/requireUser/requireOwner) with derived owner tier"
```

---

## Task 9: OAuth route handlers

**Files:**
- Create: `app/api/auth/github/route.ts`
- Create: `app/api/auth/github/callback/route.ts`
- Create: `app/api/auth/logout/route.ts`

- [ ] **Step 1: Start route — `app/api/auth/github/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { buildAuthorizeUrl, generateState } from "@/lib/github-oauth";

const STATE_COOKIE = "leet_oauth_state";

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(getClientIp(req)))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 500 });
  }
  const state = generateState();
  const res = NextResponse.redirect(buildAuthorizeUrl(clientId, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the round-trip
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
```

- [ ] **Step 2: Callback route — `app/api/auth/github/callback/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyState, exchangeCodeForToken, fetchGitHubProfile } from "@/lib/github-oauth";
import { upsertGitHubUser } from "@/lib/users";
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/sessions";

const STATE_COOKIE = "leet_oauth_state";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const queryState = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?auth_error=${reason}`, req.url));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  if (!code || !verifyState(cookieState, queryState)) return fail("state");

  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(token);
    const user = await upsertGitHubUser(profile);
    const sessionId = await createSession(user.id);

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 }); // clear one-time state
    return res;
  } catch {
    return fail("oauth"); // never leak token/secret details
  }
}
```

- [ ] **Step 3: Logout route — `app/api/auth/logout/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE_NAME } from "@/lib/sessions";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) await destroySession(token);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `bun run build`
Expected: build succeeds (routes compile). It will fail only if a type/import is wrong — fix before continuing. (Live OAuth is verified manually in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add app/api/auth
git commit -m "feat: github oauth route handlers (start, callback, logout)"
```

---

## Task 10: next.config.ts — security headers + libsql external

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Replace `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/isomorphic-fetch",
    "libsql",
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://avatars.githubusercontent.com; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
        },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default nextConfig;
```

Note: `img-src` allows `avatars.githubusercontent.com` for user avatars. This CSP will be extended in later slices (Pyodide/Monaco need `worker-src blob:` and wider `connect-src`).

- [ ] **Step 2: Verify build still succeeds**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: security headers + libsql serverExternalPackages"
```

---

## Task 11: Shell — theme tokens, layout, navbar, landing, dashboard

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/Navbar.tsx`
- Modify: `app/page.tsx`
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace `app/globals.css` with the dark token set**

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-border: var(--border);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --background: #000000;
  --foreground: #ffffff;
  --surface: #0a0a0a;
  --surface-alt: #141414;
  --border: rgba(255, 255, 255, 0.12);
  --muted: rgba(255, 255, 255, 0.6);
  --accent: #ffffff;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), system-ui, sans-serif;
}
```

- [ ] **Step 2: Create `components/Navbar.tsx`** (server component; reads current user)

```tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export default async function Navbar() {
  const user = await getCurrentUser();
  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4 text-sm lowercase">
      <Link href="/" className="font-mono tracking-tight text-foreground">
        leet
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-muted">
              {user.githubLogin} · {user.tier}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-muted hover:text-foreground">
                log out
              </button>
            </form>
          </>
        ) : (
          <Link href="/api/auth/github" className="text-foreground hover:text-muted">
            sign in with github
          </Link>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Replace `app/layout.tsx`** (keep Geist fonts; add navbar + metadata)

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "leet — leetcode mastery",
  description: "a tiered, spaced-repetition course for mastering coding-interview patterns.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Replace `app/page.tsx`** (minimal landing)

```tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-3xl font-mono tracking-tight">leetcode, but a mastery course.</h1>
      <p className="text-muted leading-relaxed">
        a tiered syllabus of data structures and techniques. articles teach each pattern,
        problems drill it, and your weak patterns come back on a spaced schedule — so you
        know what to practice and where to stop.
      </p>
      {user ? (
        <Link href="/dashboard" className="text-foreground underline underline-offset-4">
          go to your dashboard →
        </Link>
      ) : (
        <Link href="/api/auth/github" className="text-foreground underline underline-offset-4">
          sign in with github to start →
        </Link>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Create `app/dashboard/page.tsx`** (the proof page)

```tsx
import { requireUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser(); // redirects to "/" if logged out

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-24 lowercase">
      <p className="text-muted">
        signed in as <span className="text-foreground">{user.githubLogin}</span> · tier:{" "}
        <span className="text-foreground">{user.tier}</span>
      </p>
      <div className="rounded border border-border bg-surface p-6">
        <p className="text-muted">your mastery track starts here.</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Verify build + lint**

Run:
```bash
bun run build && bun run lint
```
Expected: both PASS. Fix any unused-import or type errors before committing.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx app/dashboard components/Navbar.tsx
git commit -m "feat: dark shell — theme tokens, navbar, landing, dashboard proof page"
```

---

## Task 12: Full verification + env docs

**Files:**
- Modify: `.env.local` (add the new keys — values filled by the human)
- Modify: `README.md` (document env vars + GitHub OAuth app setup)

- [ ] **Step 1: Run the whole test suite**

Run: `bun run test`
Expected: all unit/integration tests PASS (tiers, db, users, sessions, rate-limit, github-oauth).

- [ ] **Step 2: Production build + lint**

Run: `bun run build && bun run lint`
Expected: both PASS.

- [ ] **Step 3: Add the new env keys to `.env.local`**

Append (values supplied by the human operator — leave blank if not yet registered):
```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ADMIN_KEY=
OWNER_GITHUB_LOGIN=justin06lee
```
(`TURSO_DB_URL` / `TURSO_DB_AUTH_TOKEN` are already present.)

- [ ] **Step 4: Document setup in `README.md`**

Add a section:
```markdown
## Auth setup (Slice 1)

1. Register a GitHub OAuth app at https://github.com/settings/developers.
   - Authorization callback URL (prod): `https://leet.justin06lee.dev/api/auth/github/callback`
   - For local dev, register a second app/callback: `http://localhost:3000/api/auth/github/callback`
2. Copy `.env.example` to `.env.local` and fill `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
   `ADMIN_KEY`, `OWNER_GITHUB_LOGIN`. Turso vars are already provisioned.
3. `bun run dev`, open `/`, click "sign in with github".

Tiers: new users are `free`; the `OWNER_GITHUB_LOGIN` account resolves to `owner`
automatically. `paid` is granted manually (DB `UPDATE users SET tier='paid'`) until
billing exists.
```

- [ ] **Step 5: Manual end-to-end verification (human, with real GitHub app configured)**

- `bun run dev`, visit `/` → shows landing + "sign in with github".
- Click sign-in → GitHub consent → redirected back to `/dashboard`.
- Dashboard shows your `github_login` and `tier: owner` (since you are `OWNER_GITHUB_LOGIN`).
- Navbar shows login + tier + "log out"; clicking "log out" returns to `/` and the session is gone (dashboard now redirects to `/`).
- Confirm in Turso that a `users` row and a `sessions` row were created.

Expected: all steps behave as described.

- [ ] **Step 6: Commit**

```bash
git add README.md .env.local
git commit -m "docs: oauth/env setup for the foundation slice"
```
Note: confirm `.env.local` is gitignored (it should be — `git status` must NOT show it as staged). If it is ignored, drop it from the `git add` and commit only `README.md`.

---

## Self-Review (completed during planning)

- **Spec coverage:** users+sessions schema (T3), GitHub OAuth start/callback/logout (T9), owner-via-`OWNER_GITHUB_LOGIN` derived at read time (T2+T8), tiers + `canUseServerJudge`/`canSeeHiddenTests` (T2), rate-limited auth (T6+T9), `getCurrentUser`/`requireUser`/`requireOwner` (T8), shell + navbar + dashboard proof page (T11), env vars + security headers + cookie flags (T1/T9/T10/T12), tests for tier truth table / owner-stamping (via `resolveTier`) / session expiry / state mismatch (T2/T5/T7). All spec sections map to a task.
- **Owner-stamping note:** the spec described "stamp owner on upsert"; the plan implements the equivalent, cleaner **derive-at-read** (store only free/paid, overlay owner via `resolveTier`). This satisfies the spec's stated intent ("derived from env, not stored trust; survives DB resets; can't be self-assigned") and is more testable. Flagged here so it isn't read as a deviation.
- **Type consistency:** `Tier`, `User`, `GitHubProfile`, `CurrentUser`, `mapUserRow`, `SESSION_COOKIE_NAME`, `SESSION_TTL_SECONDS`, `getCurrentUser`, `upsertGitHubUser`, `createSession`/`getSessionUser`/`destroySession`, `buildAuthorizeUrl`/`verifyState`/`generateState`/`exchangeCodeForToken`/`fetchGitHubProfile` are named consistently across the tasks that define and consume them.
- **Placeholder scan:** no TBD/TODO; every code step contains complete code.
