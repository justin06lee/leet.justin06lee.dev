# Slice 4 — The brain Implementation Plan

> Use superpowers:subagent-driven-development. TDD for pure SRS + stores. Commit per task.

**Goal:** SRS scheduling from 5-level self-grades, a daily practice session, and a mastery dashboard vs. the TOOLKIT.

**Architecture:** Pure SRS core (`lib/srs.ts`, unit-tested) + DB stores (srs_state, reviews) + server action (`requireUser`) + dashboard/session/mastery pages reusing the Slice 3 `PracticePanel`. Builds on Slices 1–3.

**Spec:** `docs/superpowers/specs/2026-06-16-leet-brain-design.md`.

**Conventions:** Next 16 App Router (params/searchParams are Promises; `cookies()` async; read `node_modules/next/dist/docs/` if unsure). `lib/`+`@/*` at root. Dark/lowercase/no-emoji chrome. In-memory libSQL for tests. Available: `requireUser`/`getCurrentUser` (`@/lib/auth-server`), `Problem`/`listProblems`/`getProblemBySlug`/`getTests` (`@/lib/problems`), `PATTERNS`/`getPattern`/`Tier` (`@/lib/toolkit`), `PracticePanel` (`@/components/practice/PracticePanel`).

---

## Task 1: Schema + pure SRS core (TDD)

**Files:** `lib/db.ts` (extend batch), `lib/db.test.ts` (extend), `lib/srs.ts`, `lib/srs.test.ts`, `lib/day.ts`, `lib/day.test.ts`

1. Extend `doInit` batch (append; don't remove existing):
```sql
CREATE TABLE IF NOT EXISTS srs_state (
  user_id TEXT NOT NULL, problem_id TEXT NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5, interval_days INTEGER NOT NULL DEFAULT 0,
  due_at TEXT, reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0,
  last_grade INTEGER, updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, problem_id)
)
CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_state(user_id, due_at)
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, problem_id TEXT NOT NULL,
  grade INTEGER NOT NULL, reviewed_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
CREATE INDEX IF NOT EXISTS idx_reviews_user_day ON reviews(user_id, reviewed_on)
```
Extend `db.test.ts` to assert the two new tables exist.

2. `lib/day.ts` (PURE): `export function epochDay(d?: Date): number` (UTC days since epoch = `Math.floor(date.getTime()/86400000)`; default `new Date()`); `export function dayToISO(day: number): string` (→ `YYYY-MM-DD`, UTC); `export function isoToDay(iso: string): number`. Tests: round-trip `dayToISO(isoToDay("2026-06-16"))==="2026-06-16"`; `epochDay(new Date("2026-06-16T12:00:00Z"))` is stable.

3. `lib/srs.ts` (PURE):
```ts
export interface SrsCore { ease: number; intervalDays: number; reps: number; lapses: number; lastGrade: number | null; }
export interface SrsState extends SrsCore { dueDay: number; }
export const DEFAULT_SRS: SrsCore; // ease 2.5, intervalDays 0, reps 0, lapses 0, lastGrade null
export type Grade = 0 | 1 | 2 | 3 | 4;
export function schedule(prev: SrsCore, grade: Grade, todayDay: number): SrsState;
```
Exact rules (implement verbatim):
- `clamp = (e) => Math.min(3.0, Math.max(1.3, e))`.
- grade 0: `reps=0; lapses=prev.lapses+1; ease=clamp(prev.ease-0.2); intervalDays=1`.
- grade ≥ 1: `ease=clamp(prev.ease + (0.1 - (4-grade)*0.08)); reps=prev.reps+1;`
  - `intervalDays = reps===1 ? 1 : reps===2 ? 6 : Math.round(prev.intervalDays * ease)`.
  - if `grade===1` (hard): `intervalDays = Math.max(1, Math.round((reps<=2 ? intervalDays : prev.intervalDays) * 1.2))`.
- `dueDay = todayDay + intervalDays; lastGrade = grade`. Return all fields.

4. `lib/srs.test.ts`: first good(2) → reps1,interval1,due today+1; second good → interval6; third good → round(6*ease) (compute expected); grade0 → reps0,interval1,lapses+1, ease=2.3; ease clamps (repeated easy never exceeds 3.0; repeated again never below 1.3); hard(1) interval grows slower than good; easy(4) raises ease by 0.1.

5. `bun run test lib/srs.test.ts lib/day.test.ts lib/db.test.ts` green. Commit: `feat: srs schema + pure spaced-repetition scheduler + day helpers`.

---

## Task 2: SRS store

**Files:** `lib/srs-store.ts`, `lib/srs-store.test.ts`

```ts
import type { Grade, SrsState } from "./srs";
export async function getSrsState(userId: string, problemId: string): Promise<SrsState | null>;
export async function recordReview(userId: string, problemId: string, grade: Grade, todayDay: number): Promise<SrsState>;
export async function getDueProblemIds(userId: string, todayDay: number): Promise<string[]>; // due_at ≤ dayToISO(todayDay)
```
- `recordReview`: read existing srs_state (map to SrsCore) or `DEFAULT_SRS`; `schedule(core, grade, todayDay)`; upsert srs_state (store `due_at = dayToISO(dueDay)`, `updated_at=datetime('now')`); insert a `reviews` row (`id=randomUUID()`, `reviewed_on=dayToISO(todayDay)`). Return the new SrsState.
- `getDueProblemIds`: `SELECT problem_id FROM srs_state WHERE user_id=? AND due_at IS NOT NULL AND due_at <= ?` (ISO compare works lexically for `YYYY-MM-DD`).
- Tests: recordReview on a fresh (user,problem) creates srs_state + 1 reviews row; second recordReview updates the same srs_state row (reps increments) + 2 reviews rows total; getDueProblemIds includes a problem due today/yesterday, excludes one due tomorrow; getSrsState returns null when absent.
- Commit: `feat: srs store (record review, due lookup)`.

---

## Task 3: Daily session assembly

**Files:** `lib/session.ts`, `lib/session.test.ts`

```ts
import type { Problem } from "./problems";
export interface SessionItem { problem: Problem; kind: "review" | "new"; }
export async function buildDailySession(userId: string, opts?: { todayDay?: number; newLimit?: number; reviewLimit?: number }): Promise<{ items: SessionItem[] }>;
```
- Defaults: `todayDay = epochDay()`, `newLimit=5`, `reviewLimit=20`.
- reviews: published problems whose srs_state (for this user) is due ≤ today, up to reviewLimit, ordered by due_at asc. (Join srs_state→problems where published=1.)
- new: published problems with NO srs_state row for this user, up to newLimit, ordered by pattern tier (core→intermediate→stretch via `getPattern`, unknown/null last) then created_at. Use `listProblems({})` + filter out ids already in srs_state.
- items: reviews first, then new (document this ordering in a comment).
- Tests (seed a couple problems + srs_state rows directly via db): due review included; a problem due tomorrow excluded from reviews; new excludes already-scheduled; respects newLimit/reviewLimit; unpublished never appears.
- Commit: `feat: daily session assembly (due reviews + new problems)`.

---

## Task 4: Mastery computation

**Files:** `lib/mastery.ts`, `lib/mastery.test.ts`

```ts
import type { Tier, PatternKind } from "./toolkit";
export interface PatternMastery { key: string; label: string; kind: PatternKind; tier: Tier; problemCount: number; attempted: number; mastered: number; }
export interface TierRollup { patterns: number; attempted: number; mastered: number; problemCount: number; }
export interface Mastery {
  perPattern: PatternMastery[];
  tiers: Record<Tier, TierRollup>;
  dueToday: number; streakDays: number; totalReviews: number;
}
export async function getMastery(userId: string, todayDay?: number): Promise<Mastery>;
```
- `problemCount` per pattern = published problems with that pattern.
- `attempted` per pattern = distinct problems of that pattern with a srs_state row for the user.
- `mastered` per pattern = srs_state rows (for that pattern's problems) with `interval_days >= 21` OR (`reps >= 3` AND `last_grade >= 2`). Document the rule in code.
- `tiers`: rollups summing perPattern grouped by tier (count of patterns, attempted patterns? — define: `patterns` = number of patterns in tier that have ≥1 published problem; `attempted`/`mastered`/`problemCount` = sums across the tier). Keep definitions explicit in comments.
- `dueToday` = count of srs_state due ≤ today for the user.
- `streakDays` = consecutive days ending today (or yesterday if nothing today yet — choose: count back from today; if today has a review, include it; stop at the first missing day) computed from distinct `reviewed_on` in `reviews`.
- `totalReviews` = count of reviews rows for the user.
- Tests: build problems across patterns/tiers + srs_state + reviews; assert perPattern attempted/mastered, a tier rollup, dueToday, totalReviews, and streak (3 consecutive days → 3; a gap → streak stops). Use fixed `todayDay` for determinism.
- Commit: `feat: mastery computation (per-pattern, tier rollups, streak, coverage)`.

---

## Task 5: recordReview action + real dashboard

**Files:** `app/dashboard/actions.ts` (`"use server"`), `app/dashboard/page.tsx` (replace)

- `recordReviewAction(problemId: string, grade: number)`: `await requireUser()`; validate `grade ∈ {0,1,2,3,4}` and the problem exists + is published (`getProblemBySlug`? we have id — add a small check via a published lookup; simplest: load via a `getProblemById`-like — if none exists, query `problems` directly or accept that session only passes valid published ids and still re-check published). `recordReview(user.id, problemId, grade as Grade, epochDay())`; `revalidatePath("/dashboard"); revalidatePath("/session"); revalidatePath("/mastery")`. Return `{ ok: true, dueAtISO }`.
- `app/dashboard/page.tsx` (`requireUser`, `force-dynamic`): load `getMastery(user.id)` + `buildDailySession(user.id)` count. Show: greeting (`user.githubLogin`), **due today** + **streak**, a "start daily session" button → `/session` (disabled/"nothing due" hint if the session would be empty AND no new problems), tier coverage bars (attempted/mastered of problemCount per tier), totalReviews; links to `/mastery`, `/problems`, `/toolkit`.
- Build/lint pass. Commit: `feat: record-review action + real mastery dashboard`.

---

## Task 6: Daily session runner

**Files:** `app/session/page.tsx` (server: `requireUser`, loads session items + their visible tests), `components/session/SessionRunner.tsx` (`"use client"`)

- `app/session/page.tsx`: `const user = await requireUser();` `const { items } = await buildDailySession(user.id);` For each item load visible tests: `getTests(problem.id,{includeHidden:false})`. Pass to `<SessionRunner items={[{problem fields needed, visibleCases, kind}]} />`. Do NOT send hidden tests. If `items` empty → render an empty-state ("nothing due — browse problems" link).
- `components/session/SessionRunner.tsx`: props = array of `{ slug, title, statement, judgingMode, functionName, starterCode, pattern (label), kind, cases }`. State: current index. For the current item: show title + statement (render statement as plain text or pass through a markdown render if easy — plain `<pre>`/text is acceptable here to avoid server/client markdown coupling; or import the existing `Markdown` client component). Hide the pattern label when `kind==="new"` (until graded). Render `<PracticePanel ...>` for the item (reuse Slice 3). Below: a self-grade row — 5 buttons (again/hard/ok/good/easy → grades 0..4). Clicking a grade: `await recordReviewAction(slugOrId, grade)` — NOTE the action needs the problem **id**; pass `id` in props (server page has it). Reveal the pattern, then advance to next index. Progress `i/n`. After the last item, show a summary (counts by grade chosen, "done — come back tomorrow"). 
- Keep it client-driven; one item at a time. Lowercase chrome, no emojis.
- Build/lint pass. Commit: `feat: daily session runner with self-grading`.

---

## Task 7: Mastery page + nav + verification

**Files:** `app/mastery/page.tsx`, `components/Navbar.tsx` (add links), final verify.

- `app/mastery/page.tsx` (`requireUser`, `force-dynamic`): `getMastery(user.id)`. Render per-pattern grouped by kind→tier (like `/toolkit`) with columns: pattern label, problems, attempted, mastered, last-grade-ish indicator. Tier rollups + overall coverage. Muted rows for patterns with no content.
- `components/Navbar.tsx`: when logged in, add `dashboard` link (and keep existing). `practice`/`articles`/`toolkit` already present from Slice 2; add `dashboard` + maybe `mastery` (or reach mastery from dashboard). Keep owner-only `admin`.
- Run `bun run test` (all green), `bun run build`, `bun run lint`.
- Commit: `feat: mastery page + nav + slice 4 verification`.

---

## Self-Review (planning)
- Spec coverage: schema+SRS (T1), srs store (T2), session assembly (T3), mastery (T4), action+dashboard (T5), session runner reusing PracticePanel (T6), mastery page+nav (T7). All mapped.
- SRS algorithm pinned exactly (deterministic, testable). Day math isolated in `lib/day.ts` so `schedule` stays pure on integers.
- Hidden tests never sent to the session client (only `getTests(includeHidden:false)`).
- recordReview needs the problem id (not slug) — flagged in T6 props.
