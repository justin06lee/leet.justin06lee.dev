# Slice 2 — Content layer (problems + articles)

Second slice of `leet.justin06lee.dev`. Vision: `2026-06-15-leet-platform-vision.md`.
Builds on Slice 1 (auth, tiers, `getCurrentUser`/`requireOwner`, dark shell).

**Goal:** An owner can author **articles** (markdown lessons) and **problems**
(pattern-tagged, with test cases) through an in-app admin UI stored in Turso.
Anyone can browse published problems and articles, see a problem's statement,
visible examples, and starter code. **No code execution yet** — that's Slice 3;
this slice ends at "view the problem and its examples."

## Non-goals
- No code editor / execution / judging (Slice 3).
- No progress tracking / SRS (Slice 4).
- No Stripe; no Judge0.

## Pattern taxonomy (`lib/toolkit.ts`)
A canonical, code-defined list derived from `TOOLKIT.md`, the shared vocabulary
problems and articles tag against (and Slice 4's coverage dashboard consumes).

```ts
export type PatternKind = "structure" | "technique";
export type Tier = "core" | "intermediate" | "stretch";
export interface Pattern { key: string; label: string; kind: PatternKind; tier: Tier; }
export const PATTERNS: Pattern[]; // ~one entry per TOOLKIT.md bullet, stable kebab-case keys
export function getPattern(key: string): Pattern | undefined;
```
Keys are stable kebab-case (e.g. `hash-map`, `sliding-window`, `two-pointers-opposite`,
`monotonic-stack`, `dp-1d`, `dijkstra`, `union-find`). Tier matches the TOOLKIT
section the bullet appears under. `tier` here is the SYLLABUS tier of the pattern;
note it is distinct from a problem's `difficulty`.

## Data model (Turso, raw SQL, extend `initDb()`)

### `articles`
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| slug | TEXT | unique index |
| title | TEXT | |
| pattern | TEXT | nullable; a `PATTERNS` key |
| body | TEXT | markdown |
| published | INTEGER | default 0 |
| created_at / updated_at | TEXT | `datetime('now')` |

### `problems`
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| slug | TEXT | unique index |
| title | TEXT | |
| statement | TEXT | markdown |
| pattern | TEXT | nullable; a `PATTERNS` key |
| difficulty | TEXT | `easy` \| `medium` \| `hard` |
| judging_mode | TEXT | `function` \| `stdio` |
| function_name | TEXT | nullable; required when mode=`function` |
| params | TEXT | JSON `[{name, type}]`; function mode (drives stubs/harness in Slice 3) |
| return_type | TEXT | nullable; function mode |
| starter_code | TEXT | JSON map `{ "python": "...", "javascript": "..." }` |
| published | INTEGER | default 0 |
| created_at / updated_at | TEXT | |

### `problem_tests`
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| problem_id | TEXT | → problems.id (app-level cascade on delete) |
| ordinal | INTEGER | display/run order |
| kind | TEXT | `visible` \| `hidden` |
| input | TEXT | function mode: JSON array of args; stdio mode: raw stdin |
| expected | TEXT | function mode: JSON expected value; stdio mode: raw stdout |

Index `problem_tests(problem_id, ordinal)`. Hidden tests are never sent to the
client for `free`-tier users (enforced in the query layer / Slice 3); in Slice 2
the public problem page shows only `visible` tests as "examples."

## Modules (`lib/`)
- `lib/toolkit.ts` — patterns (above).
- `lib/articles.ts` — `Article` type, `mapArticleRow`, `createArticle`, `updateArticle`,
  `getArticleBySlug(slug, {includeUnpublished})`, `listArticles({includeUnpublished})`,
  `deleteArticle`. Slugs auto-derived from title if absent, deduped.
- `lib/problems.ts` — `Problem`, `ProblemTest`, `mapProblemRow`, JSON-safe parse helpers
  for `params`/`starter_code`, `createProblem`, `updateProblem`, `getProblemBySlug`,
  `listProblems(filters)`, `deleteProblem` (also deletes its tests),
  `getTests(problemId, {includeHidden})`, `replaceTests(problemId, tests[])`.
  Defensive JSON parsing (try/catch → safe default) for malformed columns.
- `lib/slug.ts` — `slugify(title)` + uniqueness helper.

## Mutations = server actions (owner-gated)
Admin create/update/delete are **server actions** (`"use server"`), each calling
`requireOwner()` from Slice 1 before any write (mirrors the main site's
`content-actions.ts`). No new route handlers, no new auth guard needed. Validate
inputs (slug format, judging_mode enum, difficulty enum, JSON fields parse, function
mode requires `function_name`).

## Pages
**Public (server components, `force-dynamic`):**
- `/problems` — filterable list (by pattern, tier, difficulty); shows title, pattern
  label, difficulty, mode badge. Only `published`.
- `/problems/[slug]` — rendered statement, visible examples (input→expected),
  starter-code display (read-only, per language), pattern/difficulty/mode badges.
  A disabled "practice (coming soon)" affordance — Slice 3 fills it.
- `/articles` — list of published articles (title, pattern).
- `/articles/[slug]` — rendered markdown article.
- `/toolkit` — the syllabus map: PATTERNS grouped by kind+tier, each linking to its
  article (if any) and listing its problems. This is the course's spine.

**Admin (owner-gated via `requireOwner()` at top of each page):**
- `/admin` — links to problem/article management; counts.
- `/admin/problems`, `/admin/problems/new`, `/admin/problems/[id]/edit` — form with
  all fields + a test-case editor (add/remove rows, mark visible/hidden, set
  input/expected, reorder). Publish toggle.
- `/admin/articles`, `/admin/articles/new`, `/admin/articles/[id]/edit` — title,
  pattern picker, markdown body, publish toggle.

## Markdown rendering
Add `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-slug`
+ `katex` + `isomorphic-dompurify` (versions matching the main site). A
`components/Markdown.tsx` renderer; sanitize output. Update CSP in `next.config.ts`
to allow KaTeX fonts/styles if needed (`style-src` already allows `'unsafe-inline'`;
katex CSS is inlined via import — verify build).

## Conventions
Dark/minimal/lowercase, no emojis. Tailwind theme tokens from Slice 1. Server
components by default; `"use client"` only for interactive admin forms / filter
controls. Path alias `@/*` → repo root.

## Testing (Vitest, in-memory libSQL)
- `toolkit`: keys unique, every pattern has valid kind+tier, `getPattern` round-trips.
- `slug`: slugify rules + uniqueness dedupe.
- `articles`: create→get→list(published filter)→update→delete; slug auto/dedupe.
- `problems`: create (function + stdio) → get → list filters (pattern/tier/difficulty/
  published) → update; `params`/`starter_code` JSON round-trip; malformed JSON →
  safe default. `deleteProblem` removes its tests. `getTests(includeHidden:false)`
  excludes hidden. `replaceTests` swaps the set atomically-ish.
- Validation: function mode without `function_name` rejected; bad enums rejected.

## Definition of done
- `bun run test`, `bun run build`, `bun run lint` pass.
- Owner can create a published problem (both modes) + article via the admin UI;
  they appear on the public pages; hidden tests are not shown publicly; `/toolkit`
  maps patterns to content. Non-owners get redirected away from `/admin/*`.
