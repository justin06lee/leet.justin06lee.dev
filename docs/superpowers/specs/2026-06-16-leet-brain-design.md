# Slice 4 — The brain (SRS, daily session, mastery)

Fourth slice of `leet.justin06lee.dev`. Builds on Slice 1 (auth/tiers/`requireUser`),
Slice 2 (problems + `lib/toolkit.ts` patterns), Slice 3 (practice panel). Vision:
`2026-06-15-leet-platform-vision.md`.

**Goal:** Turn the site from "browse + run" into a *mastery course*. A logged-in
user self-grades each attempt (5 levels), a spaced-repetition scheduler decides when
each problem comes back, a **daily session** assembles due reviews + new (pattern-
hidden) problems, and a **dashboard** shows per-pattern mastery and coverage vs. the
TOOLKIT syllabus.

## Non-goals
- No server judge / hidden tests (Slice 5, deferred). Practice still runs visible
  tests in-browser (Slice 3); the SRS signal is the user's self-grade.
- No social/leaderboard features.

## Core concept: self-grade → schedule
After attempting a problem (running visible tests via the Slice 3 panel), the user
picks a 5-level grade. The grade drives the spaced-repetition schedule for that
(user, problem). New problems in a session are shown **pattern-hidden** (the user
must recognize the pattern themselves); the pattern is revealed after grading.

Grades (0–4): `0 again`, `1 hard`, `2 ok`, `3 good`, `4 easy`.

## Data model (Turso, extend `initDb()`)

### `srs_state` — per (user, problem) scheduling state
| column | type | notes |
|---|---|---|
| user_id | TEXT | → users.id |
| problem_id | TEXT | → problems.id |
| ease | REAL | default 2.5 (clamp 1.3–3.0) |
| interval_days | INTEGER | default 0 |
| due_at | TEXT | date `YYYY-MM-DD` |
| reps | INTEGER | default 0 |
| lapses | INTEGER | default 0 |
| last_grade | INTEGER | nullable |
| updated_at | TEXT | |
PRIMARY KEY (user_id, problem_id). Index on (user_id, due_at).

### `reviews` — append-only log of grade events
| column | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| user_id | TEXT | |
| problem_id | TEXT | |
| grade | INTEGER | 0–4 |
| reviewed_on | TEXT | date `YYYY-MM-DD` (for streaks) |
| created_at | TEXT | timestamp |
Index on (user_id, reviewed_on).

## SRS algorithm (`lib/srs.ts`, PURE, unit-tested)
```ts
export interface SrsState { ease: number; intervalDays: number; reps: number; lapses: number; lastGrade: number | null; dueDay: number; }
export const DEFAULT_SRS: Omit<SrsState,"dueDay">; // ease 2.5, interval 0, reps 0, lapses 0, lastGrade null
// todayDay/dueDay are integer epoch-days (UTC). schedule returns the next state.
export function schedule(prev: { ease:number; intervalDays:number; reps:number; lapses:number }, grade: 0|1|2|3|4, todayDay: number): SrsState;
```
Rules:
- clamp ease to [1.3, 3.0].
- **grade 0 (again):** `reps=0; lapses+=1; ease=clamp(ease-0.2); intervalDays=1`.
- **grade >= 1:**
  - `ease = clamp(ease + (0.1 - (4-grade)*0.08))` → +0.10 (easy), +0.02 (good), −0.06 (ok), −0.14 (hard).
  - `reps += 1`.
  - interval: `reps===1 → 1`; `reps===2 → 6`; else `round(prevInterval * ease)`.
  - hard penalty: if `grade===1`, `intervalDays = max(1, round((reps<=2?intervalDays:prevInterval) * 1.2))` (hard advances slowly). Keep simple + deterministic; document exact formula in code.
- `dueDay = todayDay + intervalDays`. `lastGrade = grade`.
Helper: `epochDay(date = now): number` (UTC day index) and `dayToISO(day): string` (`YYYY-MM-DD`) — but keep `schedule` pure (takes/returns day integers; date conversion lives in callers/another tiny pure module so it stays testable).

## Stores
- `lib/srs-store.ts`:
  - `recordReview(userId, problemId, grade, todayDay)` — load existing `srs_state` (or DEFAULT), `schedule(...)`, upsert `srs_state`, insert a `reviews` row (`reviewed_on` from todayDay). Returns the new `SrsState`.
  - `getSrsState(userId, problemId)` / `getDueProblemIds(userId, todayDay)`.
- `lib/session.ts`:
  - `buildDailySession(userId, { todayDay, newLimit=5, reviewLimit=20 })`: returns
    `{ items: { problem: Problem; kind: "review" | "new" }[] }` — due reviews
    (srs_state.due_at ≤ today, published) up to reviewLimit, plus new published
    problems with no srs_state for this user up to newLimit (new ordered core→
    intermediate→stretch via pattern tier, then by created order). Items mixed
    (reviews first or interleaved — implementer’s call, document it).
- `lib/mastery.ts`:
  - `getMastery(userId)`: returns
    `{ perPattern: { key, label, kind, tier, problemCount, attempted, mastered }[],
       tiers: { core/intermediate/stretch: { patterns, attempted, mastered, problemCount } },
       dueToday: number, streakDays: number, totalReviews: number }`.
  - "attempted" = has any srs_state for a problem of that pattern; "mastered" =
    srs_state with `intervalDays >= 21` (≈ graduated) OR `reps >= 3 && lastGrade >= 2`.
    Document the chosen rule. Coverage = problems/patterns with content vs. attempted/
    mastered. Streak = consecutive days up to today with ≥1 review (from `reviews`).

## Mutations (server actions, `requireUser`)
`app/(app)/actions.ts` or reuse a session actions file:
- `recordReviewAction(problemId, grade)` — `await requireUser()`; compute todayDay
  (server, UTC); `recordReview(...)`; `revalidatePath("/dashboard")`. Returns the
  new due date / ok. Validate `grade ∈ 0..4` and that the problem exists + is
  published.

## Pages
- **`/dashboard`** (replace the bare Slice 1 page; `requireUser`): greeting; **due
  today** count + **streak**; a prominent "start daily session" button (→ `/session`);
  a mastery snapshot — coverage bars per tier (attempted/mastered of total),
  total reviews. Links to `/mastery` and `/problems`.
- **`/session`** (`requireUser`): the daily runner. Loads `buildDailySession`.
  Steps through items one at a time. For each: show the problem statement +
  the Slice 3 `PracticePanel` (run visible tests), with the **pattern hidden** for
  `new` items. Below the panel, a self-grade row (5 buttons: again/hard/ok/good/easy)
  — on click calls `recordReviewAction`, reveals the pattern, and advances to the
  next item. A progress indicator (i/n). End-of-session summary (counts by grade,
  next due). If the session is empty ("nothing due — add new problems or come back
  tomorrow"), show that.
- **`/mastery`** (`requireUser`): the full per-pattern table grouped by kind→tier
  (like `/toolkit` but with the user's attempted/mastered/last-grade per pattern),
  plus tier rollups and coverage. Patterns with no content shown muted.

## UI / conventions
Dark/minimal/lowercase chrome, no emojis. Reuse `PracticePanel` (Slice 3) inside the
session. Self-grade buttons are plain text (again/hard/ok/good/easy). The session is
a client component driving one item at a time; data (problems + visible tests) is
loaded server-side and passed in (never send hidden tests).

## Testing (Vitest, in-memory libSQL)
- `srs.test.ts` (PURE): first review grade≥1 → interval 1, due today+1; second good →
  interval 6; third good → round(6*ease); grade 0 resets reps & sets interval 1 &
  bumps lapses & lowers ease; ease clamps at 1.3 and 3.0; hard (1) advances slowly;
  easy (4) raises ease.
- `srs-store.test.ts`: recordReview upserts srs_state + appends a reviews row;
  getDueProblemIds returns only due≤today.
- `session.test.ts`: buildDailySession returns due reviews + up to newLimit new
  problems; excludes already-scheduled problems from "new"; respects limits;
  unpublished excluded.
- `mastery.test.ts`: perPattern attempted/mastered counts; tier rollups; streak
  (consecutive days) incl. a gap breaking the streak; dueToday count.
- `bun run build` + `bun run lint` pass. Extend `scripts/seed.ts`? Not required;
  the existing demo problems suffice to exercise a session.

## Definition of done
- `bun run test`/`build`/`lint` pass.
- A logged-in user: `/dashboard` shows due/streak/coverage; "start daily session"
  runs through items, self-grading records a review and reschedules (verified via
  store tests); `/mastery` shows per-pattern progress. New problems are pattern-
  hidden until graded. (Live click-through is a manual/automated browser check;
  orchestrator will attempt a headless smoke test of recordReview + session load.)
