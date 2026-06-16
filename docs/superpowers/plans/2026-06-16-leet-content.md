# Slice 2 — Content layer Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. TDD where tests are specified. Commit per task.

**Goal:** Owner-authored articles + problems (DB, admin UI), public browse/read views, no execution yet.

**Architecture:** Next.js 16 App Router, Turso/libSQL raw SQL (extend `initDb()`), server actions for owner-gated mutations, server components for public reads, `react-markdown` for rendering. Builds on Slice 1.

**Tech Stack:** adds `react-markdown@^10.1.0`, `remark-gfm@^4.0.1`, `remark-math@^6.0.0`, `rehype-katex@^7.0.1`, `rehype-slug@^6.0.0`, `katex@^0.16.45`, `isomorphic-dompurify@^3.8.0`.

**Spec:** `docs/superpowers/specs/2026-06-16-leet-content-design.md`.

**Conventions (from Slice 1, follow exactly):** dark/minimal/lowercase, no emojis; Tailwind theme tokens (`bg-surface`, `text-muted`, `border-border`, `text-foreground`); `lib/` at repo root; `@/*` alias → root; raw SQL via `db`/`initDb` from `@/lib/db`; idempotent schema in `initDb()`; defensive JSON parsing; tests run against in-memory libSQL (vitest env already sets `TURSO_DB_URL=:memory:`). Auth helpers exist: `getCurrentUser`, `requireUser`, `requireOwner` from `@/lib/auth-server`.

---

## Task 1: Markdown deps + pattern taxonomy + slug util

**Files:** `package.json` (deps), `lib/toolkit.ts`, `lib/toolkit.test.ts`, `lib/slug.ts`, `lib/slug.test.ts`

- Install deps: `bun add react-markdown@^10.1.0 remark-gfm@^4.0.1 remark-math@^6.0.0 rehype-katex@^7.0.1 rehype-slug@^6.0.0 katex@^0.16.45 isomorphic-dompurify@^3.8.0`
- `lib/toolkit.ts`: implement the `Pattern`/`PatternKind`/`Tier` types, `PATTERNS` array, `getPattern(key)`. Derive entries from `TOOLKIT.md` (read it). One pattern per meaningful bullet across Part 1 (structures) and Part 2 (techniques), `kind` = structure|technique, `tier` = core|intermediate|stretch per the section it's under. Use stable kebab-case keys. Aim for thorough coverage (~50-70 patterns) but keys must be unique.
- `lib/slug.ts`: `slugify(title: string): string` (lowercase, alphanumeric + hyphens, collapse/trim hyphens) and `uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string>` (append `-2`, `-3`, … until free).
- Tests:
  - `toolkit.test.ts`: `PATTERNS` keys are unique; every entry has a valid `kind` and `tier`; `getPattern("hash-map")` (or another key you define) returns it; `getPattern("nope")` is undefined.
  - `slug.test.ts`: `slugify("Two Sum!")==="two-sum"`; `slugify("  C++  Tricks ")` is hyphenated/trimmed; `uniqueSlug` returns base when free, `base-2` when base taken.
- Verify: `bun run test lib/toolkit.test.ts lib/slug.test.ts` green. Commit: `feat: markdown deps, toolkit pattern taxonomy, slug util`.

---

## Task 2: Schema extension (articles, problems, problem_tests)

**Files:** `lib/db.ts` (extend `doInit` batch), `lib/db.test.ts` (extend)

- Add three `CREATE TABLE IF NOT EXISTS` statements + indexes to the existing `db.batch([...])` in `doInit` (do NOT remove existing tables):
  - `articles(id TEXT PK, slug TEXT, title TEXT, pattern TEXT, body TEXT, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))` + `CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug)`
  - `problems(id TEXT PK, slug TEXT, title TEXT, statement TEXT, pattern TEXT, difficulty TEXT NOT NULL DEFAULT 'medium', judging_mode TEXT NOT NULL DEFAULT 'function', function_name TEXT, params TEXT, return_type TEXT, starter_code TEXT, published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))` + `CREATE UNIQUE INDEX IF NOT EXISTS idx_problems_slug ON problems(slug)`
  - `problem_tests(id TEXT PK, problem_id TEXT NOT NULL, ordinal INTEGER NOT NULL DEFAULT 0, kind TEXT NOT NULL DEFAULT 'visible', input TEXT, expected TEXT)` + `CREATE INDEX IF NOT EXISTS idx_problem_tests_problem ON problem_tests(problem_id, ordinal)`
- Extend `db.test.ts`: after `initDb()`, assert `sqlite_master` contains `articles`, `problems`, `problem_tests`.
- Verify green. Commit: `feat: schema for articles, problems, problem_tests`.

---

## Task 3: Article store (`lib/articles.ts`)

**Files:** `lib/articles.ts`, `lib/articles.test.ts`

Interface:
```ts
export interface Article { id: string; slug: string; title: string; pattern: string | null; body: string; published: boolean; createdAt: string; updatedAt: string; }
export function mapArticleRow(row): Article;
export async function createArticle(input: { title: string; body: string; pattern?: string | null; slug?: string; published?: boolean }): Promise<Article>;
export async function updateArticle(id: string, patch: Partial<{ title; body; pattern; slug; published }>): Promise<Article>;
export async function getArticleBySlug(slug: string, opts?: { includeUnpublished?: boolean }): Promise<Article | null>;
export async function listArticles(opts?: { includeUnpublished?: boolean }): Promise<Article[]>;
export async function deleteArticle(id: string): Promise<void>;
```
- Slug: if `input.slug` absent, derive via `slugify(title)` then `uniqueSlug` (existence check queries `articles`). `published` stored as 0/1, mapped to boolean. `updated_at` set to `datetime('now')` on update.
- `getArticleBySlug`/`listArticles` exclude unpublished unless `includeUnpublished`.
- Tests (in-memory DB, `await initDb()` in each): create→getBySlug returns it; unpublished hidden unless includeUnpublished; list ordering by `updated_at DESC` (assert membership); update changes fields + slug stays unique; two articles same title get distinct slugs; delete removes it.
- Commit: `feat: article store`.

---

## Task 4: Problem store + tests (`lib/problems.ts`)

**Files:** `lib/problems.ts`, `lib/problems.test.ts`

Interface:
```ts
export type JudgingMode = "function" | "stdio";
export type Difficulty = "easy" | "medium" | "hard";
export interface ProblemParam { name: string; type: string; }
export interface Problem {
  id: string; slug: string; title: string; statement: string; pattern: string | null;
  difficulty: Difficulty; judgingMode: JudgingMode; functionName: string | null;
  params: ProblemParam[]; returnType: string | null; starterCode: Record<string,string>;
  published: boolean; createdAt: string; updatedAt: string;
}
export interface ProblemTest { id: string; problemId: string; ordinal: number; kind: "visible" | "hidden"; input: string; expected: string; }
export function mapProblemRow(row): Problem; // defensive JSON.parse for params (→[]) and starter_code (→{})
export async function createProblem(input): Promise<Problem>;
export async function updateProblem(id, patch): Promise<Problem>;
export async function getProblemBySlug(slug, opts?: { includeUnpublished?: boolean }): Promise<Problem | null>;
export async function listProblems(filters?: { pattern?: string; tier?: Tier; difficulty?: Difficulty; includeUnpublished?: boolean }): Promise<Problem[]>;
export async function deleteProblem(id): Promise<void>; // also delete its problem_tests
export async function getTests(problemId, opts?: { includeHidden?: boolean }): Promise<ProblemTest[]>;
export async function replaceTests(problemId, tests: Omit<ProblemTest,"id"|"problemId">[]): Promise<void>;
```
- Validation in create/update: `judging_mode` ∈ {function,stdio}; `difficulty` ∈ {easy,medium,hard}; if mode=function then `functionName` required (throw `Error("function mode requires function_name")`). `params`/`starter_code` stored as JSON strings. Slug auto/dedupe like articles.
- `listProblems` `tier` filter: resolve via `lib/toolkit.ts` `getPattern(problem.pattern)?.tier === tier` — since tier isn't a column, filter in app code after fetching published rows (fetch then filter by pattern's tier). pattern/difficulty/published filter in SQL.
- `getTests(includeHidden:false)` returns only `kind='visible'` ordered by ordinal. `replaceTests` deletes existing rows for the problem then inserts the given list with sequential ordinals (use a `db.batch`).
- Tests: create function-mode (with params, function_name, starter_code map) → mapProblemRow round-trips params/starterCode; create stdio-mode; function mode w/o function_name throws; bad difficulty throws; getProblemBySlug published filter; listProblems filters by pattern, by difficulty, by tier (define a problem whose pattern is core-tier and assert tier filter includes/excludes); malformed params JSON in a row → `[]` (insert a raw bad row then map); replaceTests swaps set and getTests(includeHidden:false) excludes hidden; deleteProblem cascades to tests.
- Commit: `feat: problem + test-case store with dual judging modes`.

---

## Task 5: Admin server actions (owner-gated)

**Files:** `app/admin/actions.ts` (`"use server"`)

- Export async actions wrapping the store functions, EACH calling `await requireOwner()` first (from `@/lib/auth-server`): `saveArticleAction(formDataOrInput)`, `deleteArticleAction(id)`, `saveProblemAction(input)`, `deleteProblemAction(id)`, `saveProblemTestsAction(problemId, tests)`. Accept plain typed objects (the client forms serialize to these) — you may accept `FormData` and parse, or accept JSON-serializable objects; pick one and be consistent. Re-validate enums/required fields server-side (don't trust client). After a successful mutation call `revalidatePath` for the affected public + admin routes.
- No test file (thin owner-gated wrappers over already-tested stores; verified via build + the admin pages). Ensure it type-checks: `bunx tsc --noEmit`.
- Commit: `feat: owner-gated admin server actions for content`.

---

## Task 6: Markdown renderer + public pages

**Files:** `components/Markdown.tsx`, `app/articles/page.tsx`, `app/articles/[slug]/page.tsx`, `app/problems/page.tsx`, `app/problems/[slug]/page.tsx`, `app/toolkit/page.tsx`, and import `katex/dist/katex.min.css` (in the Markdown component or layout).

- `components/Markdown.tsx`: render markdown via `react-markdown` with `remarkPlugins=[remark-gfm, remark-math]`, `rehypePlugins=[rehype-katex, rehype-slug]`. Sanitize the input string with `isomorphic-dompurify` before/after as appropriate (mirror the main site's `sanitize.ts` approach — keep it simple: sanitize the rendered HTML or pass through DOMPurify). Style with the dark theme; prose styles minimal/lowercase-friendly.
- `/articles`: `listArticles()` (published), render a list of links (title + pattern label). `force-dynamic`.
- `/articles/[slug]`: `getArticleBySlug(slug)`; 404 via `notFound()` if missing/unpublished; render `<Markdown>` of body, title header, pattern badge.
- `/problems`: `listProblems({...})` with filter controls (a small client component reading/writing `?pattern=&tier=&difficulty=` search params; server reads `searchParams`). Each row: title, pattern label, difficulty badge, mode badge.
- `/problems/[slug]`: `getProblemBySlug`; `notFound()` if missing/unpublished. Render statement via `<Markdown>`; badges (pattern/difficulty/mode); **visible** examples from `getTests(id,{includeHidden:false})` shown as input→expected; starter code display (read-only `<pre>` per language present in `starterCode`); a disabled "practice (coming soon)" button.
- `/toolkit`: group `PATTERNS` by `kind` then `tier`; for each pattern show its label, link to its article if one exists (query articles by pattern), and list its published problems (query problems by pattern). Keep queries efficient — fetch all published problems + articles once, group in memory by `pattern`.
- Verify `bun run build` compiles all routes; `bun run lint` clean. Commit: `feat: markdown renderer + public problem/article/toolkit pages`.

---

## Task 7: Admin pages (problems + articles CRUD)

**Files:** `app/admin/page.tsx`, `app/admin/articles/page.tsx`, `app/admin/articles/new/page.tsx`, `app/admin/articles/[id]/edit/page.tsx`, `app/admin/problems/page.tsx`, `app/admin/problems/new/page.tsx`, `app/admin/problems/[id]/edit/page.tsx`, plus client form components under `components/admin/` (e.g. `ArticleForm.tsx`, `ProblemForm.tsx`, `TestCaseEditor.tsx`).

- Every admin page server component starts with `await requireOwner()` (redirects non-owners to `/`).
- `/admin`: counts of problems/articles (published/draft) + links.
- Articles: list with edit/delete; `ArticleForm` (client) fields: title, pattern (select from `PATTERNS`), body (textarea, monospace), published (checkbox). Submits to `saveArticleAction`/`deleteArticleAction`.
- Problems: list with edit/delete; `ProblemForm` (client) fields: title, statement (textarea), pattern (select), difficulty (select), judging_mode (select function|stdio), function_name + params editor + return_type (shown when mode=function), starter_code (per-language textareas: python, javascript), published. `TestCaseEditor`: add/remove rows, each with kind (visible|hidden), input (textarea), expected (textarea), reorderable (ordinal by position). Submits problem via `saveProblemAction` and tests via `saveProblemTestsAction`.
- Forms use server actions; show validation errors. Keep UI minimal/lowercase.
- Verify build + lint. Commit: `feat: owner admin UI for problems and articles`.

---

## Task 8: Nav links + full verification

**Files:** `components/Navbar.tsx` (add links), final checks.

- Add nav links: `problems`, `articles`, `toolkit` (always); `admin` shown only when `user?.tier === "owner"`.
- Run `bun run test` (all prior + new green), `bun run build`, `bun run lint`.
- Manual checklist (document in commit body, human verifies later): owner creates a published function-mode problem with 1 visible + 1 hidden test and a stdio-mode problem; both appear under `/problems`; visible example shown, hidden not; `/toolkit` links them; an article renders markdown+katex; non-owner redirected from `/admin`.
- Commit: `feat: content nav + slice 2 verification`.

---

## Self-Review (planning)
- Spec coverage: toolkit (T1), schema (T2), article store (T3), problem+test store w/ dual modes + hidden-test exclusion (T4), owner-gated mutations (T5), public pages incl. /toolkit + markdown (T6), admin CRUD + test editor (T7), nav + gating + verify (T8). All spec sections mapped.
- Type consistency: `Pattern`/`Tier`, `Article`, `Problem`/`ProblemTest`/`JudgingMode`/`Difficulty`, store signatures, action names are consistent across tasks and match the spec.
- The `tier` filter is correctly noted as app-level (derived from pattern), not a column.
