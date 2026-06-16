# Slice 1 — Foundation (auth, tiers, shell)

The first shippable increment of `leet.justin06lee.dev`. See
`2026-06-15-leet-platform-vision.md` for the full platform vision and build order.

**Goal:** a user can sign in with GitHub, get a DB-backed session, land on a
dashboard that shows who they are and their access tier; the owner is auto-stamped
`owner`; and reusable auth/tier helpers exist for every later slice to consume.

Nothing else. No problems, articles, editor, or judge yet.

## Non-goals

- No Stripe / payment. `paid` is granted manually by an admin (later slice adds the
  admin UI; for now it can be set directly in the DB).
- No content (problems/articles) or code execution.
- No email/password auth — GitHub OAuth only.

## Stack note

This project is **Next.js 16**, newer than the main site's 15.5. Before writing any
route handlers, server components, or config, read the relevant guides in
`node_modules/next/dist/docs/` (App Router, route handlers, `cookies()` from
`next/headers`, middleware/config). APIs may differ from prior Next.js knowledge.

## Data model (Turso / libSQL, raw SQL, idempotent `initDb()`)

`initDb()` is memoized and creates tables if absent (mirrors the main site's
`lib/db.ts`). No ORM. No FK enforcement at the DB level (libsql); validate
references in app code.

### `users`
| column        | type    | notes                                          |
|---------------|---------|------------------------------------------------|
| `id`          | TEXT PK | uuid                                           |
| `github_id`   | INTEGER | unique; GitHub numeric user id                 |
| `github_login`| TEXT    | GitHub username                                |
| `name`        | TEXT    | display name (nullable)                        |
| `avatar_url`  | TEXT    | nullable                                       |
| `email`       | TEXT    | nullable (GitHub may not expose it)            |
| `tier`        | TEXT    | `owner` \| `free` \| `paid`; default `free`    |
| `created_at`  | TEXT    | ISO timestamp                                  |
| `updated_at`  | TEXT    | ISO timestamp                                  |

- Unique index on `github_id`.
- On login, **upsert** by `github_id`: insert if new (default `free`), else update
  `github_login` / `name` / `avatar_url` / `email` / `updated_at`.
- **Owner stamping:** if `github_login` equals `OWNER_GITHUB_LOGIN` (env), set
  `tier = owner` on every upsert. The owner tier is derived from env, not stored
  trust — so it survives DB resets and can't be self-assigned.

### `sessions`
| column       | type    | notes                                  |
|--------------|---------|----------------------------------------|
| `id`         | TEXT PK | uuid; the cookie value                 |
| `user_id`    | TEXT    | → `users.id`                           |
| `created_at` | TEXT    | ISO timestamp                          |
| `expires_at` | TEXT    | ISO timestamp                          |

- DB-backed so logins survive serverless cold starts.
- Index on `user_id` for logout-all / cleanup.
- Expired sessions are treated as logged-out and lazily deleted on read.

## OAuth flow

Standard GitHub OAuth web flow. Scope: `read:user` (+ `user:email` only if we want
email; keep minimal — `read:user` is enough for the dashboard).

1. **`GET /api/auth/github`** — generate a random `state`, set it in a short-lived
   httpOnly cookie, redirect to
   `https://github.com/login/oauth/authorize?client_id=…&scope=read:user&state=…&redirect_uri=…`.
2. **`GET /api/auth/github/callback`** —
   - Verify `state` matches the cookie (CSRF guard); clear the state cookie.
   - Exchange `code` at `https://github.com/login/oauth/access_token` for an access
     token (server-side, with `GITHUB_CLIENT_SECRET`).
   - Fetch `https://api.github.com/user` (and `/user/emails` only if email scope
     used).
   - Upsert the user (owner-stamp per above), mint a `sessions` row, set the
     httpOnly `leet_session` cookie (`SameSite=Lax`, `Secure` in prod, sensible
     `Max-Age` matching `expires_at`).
   - Redirect to `/dashboard`.
3. **`POST /api/auth/logout`** — delete the session row, clear the cookie, redirect
   to `/`.

Error handling: any OAuth failure (bad `state`, token exchange error, GitHub API
error) redirects to `/` with a generic error flag; never leak token/secret details.

## Auth & tier helpers (`lib/auth.ts` / `lib/auth-server.ts`)

Mirror the main site's split between route-handler and server-component contexts.

- `getCurrentUser()` — read `leet_session` cookie, look up session, check expiry,
  return the `users` row or `null`. (server-component variant uses `cookies()` from
  `next/headers`; route-handler variant reads from the request.)
- `requireUser()` — return the user or a 401 / redirect to sign-in.
- `requireOwner()` — user with `tier === 'owner'` or 403.
- `canUseServerJudge(user)` / `canSeeHiddenTests(user)` — `user.tier === 'paid' ||
  user.tier === 'owner'`. These exist now so later slices gate consistently; they
  are unused in Slice 1 beyond being exported and unit-tested.
- `ADMIN_KEY` — reserved for admin mutations in later slices (e.g. granting `paid`).
  Compared via `timingSafeEqual`. Not wired to a UI in this slice.

Rate-limit the auth endpoints (reuse the main site's approach: attempts per window,
lockout). Keep it simple but present.

## Shell / UI

- Root `app/layout.tsx` — dark-only theme tokens copied from the main site
  (`--background`, `--foreground`, `--surface`, `--border`, `--muted`, `--accent`),
  Geist/mono fonts, lowercase voice, no emojis.
- `Navbar` — wordmark on the left; right side shows **"sign in with github"** when
  logged out, or the avatar + `github_login` + tier badge + a logout control when
  logged in.
- **`/dashboard`** — server component. If logged out, prompt to sign in. If logged
  in, render "signed in as `{login}` · tier: `{tier}`" and a placeholder "your
  mastery track starts here" panel. This bare page is the proof that auth → session
  → tier resolution works end to end.
- Home `/` — minimal landing explaining the course in a sentence or two, with a
  sign-in CTA. Keep it sparse; it grows in later slices.

## Config & security

- **New env vars** (add to `.env.local`, document in README):
  `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_KEY`, `OWNER_GITHUB_LOGIN`.
  (`TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN` already set.)
- Register a GitHub OAuth app; callback URL `https://leet.justin06lee.dev/api/auth/github/callback`
  (+ a localhost callback for dev).
- Security headers in `next.config.ts` (CSP, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`) — copy the main site's config.
- Cookies httpOnly + `SameSite=Lax` + `Secure` in production.

## Testing (Vitest, Node env)

- Tier helpers: `canUseServerJudge` / `canSeeHiddenTests` truth table across all
  three tiers.
- Owner-stamping logic: a user whose `github_login === OWNER_GITHUB_LOGIN` resolves
  to `owner`; others to `free`/`paid` as stored.
- Session expiry: an expired session reads as logged-out.
- `state` mismatch in the callback is rejected.

(Pure logic is unit-tested; the live OAuth round-trip is verified manually against
the registered GitHub app.)

## Definition of done

- `bun run build` and `bun run lint` pass.
- Signing in with GitHub creates a `users` row + `sessions` row and lands on
  `/dashboard` showing the correct login and tier.
- The owner login resolves to `tier: owner`; a fresh account resolves to `free`.
- Logout clears the session and cookie.
- Tier helpers exported and unit-tested for later slices to import.
