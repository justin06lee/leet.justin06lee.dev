# leet.justin06lee.dev

A LeetCode-style **mastery course** — a tiered syllabus of data-structure and
algorithm patterns, with articles, practice problems, and spaced-repetition review.
See `docs/superpowers/specs/2026-06-15-leet-platform-vision.md` for the full vision
and build order, and `TOOLKIT.md` for the syllabus.

Built on Next.js 16 (App Router), React 19, Tailwind 4, and Turso/libSQL.

## Getting Started

```bash
bun install
bun run dev      # dev server at http://localhost:3000
bun run build    # production build
bun run lint     # eslint
bun run test     # vitest
```

## Auth setup (Slice 1)

Authentication is GitHub OAuth with DB-backed sessions.

1. Register a GitHub OAuth app at https://github.com/settings/developers.
   - Authorization callback URL (prod): `https://leet.justin06lee.dev/api/auth/github/callback`
   - For local dev, register a second app/callback: `http://localhost:3000/api/auth/github/callback`
2. Copy `.env.example` to `.env.local` and fill in:
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — from the OAuth app
   - `ADMIN_KEY` — master key for `POST /api/auth/key` (the admin API login)
   - `OWNER_GITHUB_LOGIN` — your GitHub login (auto-resolves to the `owner` tier)
   - `TURSO_DB_URL`, `TURSO_DB_AUTH_TOKEN` — already provisioned for this project
3. `bun run dev`, open `/`, click "sign in with github".

### Access tiers

- New users are `free`. The `OWNER_GITHUB_LOGIN` account resolves to `owner`
  automatically (derived at read time from the env var — never stored, so it can't
  be self-assigned and survives DB resets).
- `paid` is granted manually until billing exists:
  `UPDATE users SET tier='paid' WHERE github_login='<login>';`
- `owner`/`paid` unlock paid features in later slices (server code judge, hidden
  test cases); `free` runs in-browser Python/JS against visible tests.

## Admin API

An owner-only HTTP API mirroring the admin server actions, so external tools
(e.g. the ecosystem MCP server) can manage articles and problems. All routes
return JSON; errors are `{"error": "..."}`.

### Key login

`POST /api/auth/key` with `{"password": "<ADMIN_KEY>"}` exchanges the master
key for the same 30-day `leet_session` cookie GitHub OAuth sets, attached to
the `OWNER_GITHUB_LOGIN` user row (that account must have signed in via GitHub
at least once — 503 otherwise). Compared with `timingSafeEqual`, rate-limited
per IP like the OAuth flow (10 attempts / 15 min, then a 24h lockout).
`GET /api/auth/key` probes the cookie: `{"ok": true, "owner": bool}` or 401.

### Owner routes

All under `/api/admin/`, gated by the session cookie: 401 without a valid
session, 403 when the session's user is not the owner. Lists include
unpublished rows. Mutations trigger the same `revalidatePath` calls as their
server-action twins.

| Method + path | Does |
|---|---|
| `GET /api/admin/articles` | list all articles (summary, no body) |
| `POST /api/admin/articles` | create → `{ok, id, slug}` |
| `GET /api/admin/articles/:id` | full article incl. body |
| `PATCH /api/admin/articles/:id` | partial update (only sent fields change) |
| `DELETE /api/admin/articles/:id` | delete (404 for unknown ids) |
| `GET /api/admin/problems` | list all problems (summary) |
| `POST /api/admin/problems` | create → `{ok, id, slug}` |
| `GET /api/admin/problems/:id` | full problem incl. all tests (hidden too) |
| `PATCH /api/admin/problems/:id` | partial update |
| `DELETE /api/admin/problems/:id` | delete (cascades its tests) |
| `PUT /api/admin/problems/:id/tests` | full replace: `{"tests": [{kind, input, expected}]}`, ordinal = array index |

Field shapes match the admin forms: articles take `title` (required on
create), `body`, `pattern`, `slug`, `published`; problems take `title`
(required on create), `statement`, `pattern`, `difficulty`, `judgingMode`,
`functionName` (required when `judgingMode` is `"function"`), `params`,
`returnType`, `starterCode`, `slug`, `published`. Test `kind` must be
`"visible"` or `"hidden"`.
