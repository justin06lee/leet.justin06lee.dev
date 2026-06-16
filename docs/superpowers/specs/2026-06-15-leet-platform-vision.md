# leet.justin06lee.dev — platform vision

A LeetCode-style **mastery course**, not a LeetCode clone. `TOOLKIT.md` is the
spine: a tiered syllabus of data structures and techniques (Core / Intermediate /
Stretch). Articles teach each pattern, problems practice it, and the system tracks
which patterns are mastered vs. weak — surfacing weak ones for spaced review. The
differentiator is "know where to stop": the tiering and the weak-pattern queue.

The owner (justin06lee) is the primary user. Anyone can sign up and run their own
mastery track.

## Guiding decisions (settled during brainstorming)

- **Execution is freemium, split by where code runs:**
  - **Free** — Python (Pyodide/WASM) + JavaScript (sandboxed Web Worker), run
    entirely in the user's browser. Zero hosting cost, zero untrusted-code
    liability, scales infinitely.
  - **Paid** — C++ / Java / Go / Rust via **Judge0** (open-source) in Docker,
    self-hosted on the owner's x86 PCs initially (Jetson Orin Nano optional as a
    general ARM64 node; its GPU is irrelevant — execution is CPU + isolation).
    Containerized from day one so migrating to a VPS is a redeploy, not a rewrite.
    Exposed externally via Cloudflare Tunnel / Tailscale only once non-LAN users
    appear.
- **Do not build the sandbox from scratch.** Sandboxed multi-language execution is
  the hardest, most security-sensitive part and teaches nothing about algorithms.
  Stand on Judge0; spend effort on the curriculum/mastery layer instead.
- **Access tiers:** `owner` (justin06lee, via `OWNER_GITHUB_LOGIN`; never pays),
  `free`, `paid`.
  - Problems are **public** — anyone reads the statement, examples, pattern tag,
    notes, and may solve on their own machine.
  - Free can run Python/JS against **visible** tests in-browser.
  - Paid/owner unlock compiled/JVM languages (server judge) + **hidden** test
    cases. "The tests are the paid product."
- **No Stripe yet.** Model the tiers in the DB and gate on them now; grant `paid`
  manually via admin. Real payment integration is a later sub-project, added once
  there is someone to charge.
- **Auth:** GitHub OAuth (audience is developers; no passwords to store/reset).
- **IP note:** Do not copy LeetCode's problem statements or test cases. Author
  original problems or use an open-licensed set.

## Stack

Mirrors the main site (`justin06lee.dev`):

- Next.js 16 (App Router) — **note: newer than the main site's 15.5; read the
  bundled guides in `node_modules/next/dist/docs/` before writing code.**
- React 19, TypeScript 5, Tailwind 4, `motion`.
- Turso / libSQL via `@libsql/client` — **raw SQL, no ORM.** Schema bootstrapped by
  an idempotent `initDb()`.
- Hand-rolled DB-backed sessions + httpOnly cookie (the main site's pattern).
- Markdown articles via `react-markdown` + `remark-gfm` + `remark-math` +
  `rehype-katex`.
- Dark-only, minimal black/white aesthetic, motion-driven, **lowercase voice**, no
  emojis in product copy.

## Build order (each its own spec → plan → build)

1. **Foundation** — multi-user GitHub-OAuth accounts, the three access tiers, DB
   bootstrap, app shell + bare dashboard. *(spec: `2026-06-15-leet-foundation-design.md`)*
2. **Content layer** — problem bank (pattern + tier tagged, public) and articles
   (markdown), with admin authoring. No execution yet.
3. **Free execution** — in-browser code editor + Pyodide + JS worker, run against
   visible tests. *Now it's a usable practice site.*
4. **The brain** — 5-level self-grades, SRS scheduler, daily practice session (due
   reviews + new mixed *unlabeled* problems), per-pattern mastery dashboard,
   coverage-vs-TOOLKIT. *Now it's the mastery course.*
5. **Paid server judge** — Judge0 / Docker, compiled languages, hidden tests,
   paywall. *Now it's multi-language and self-funding.*

The server judge is intentionally **last**: the free tier proves the entire
learning loop, and it is the most ops-heavy piece, so it must not block a working
site. It can be pulled earlier if desired, but the default is to hold it here.

Later / out of scope for now: Stripe billing, classifier flashcards, exams/gates,
streaks beyond a basic dashboard.
