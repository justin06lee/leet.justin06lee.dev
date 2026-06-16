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
   - `ADMIN_KEY` — reserved for later admin mutations
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
