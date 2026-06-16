import { db, initDb } from "./db";
import { PATTERNS, type Tier, type PatternKind } from "./toolkit";
import { epochDay, dayToISO, isoToDay } from "./day";

export interface PatternMastery {
  key: string;
  label: string;
  kind: PatternKind;
  tier: Tier;
  problemCount: number;
  attempted: number;
  mastered: number;
}

export interface TierRollup {
  patterns: number;
  attempted: number;
  mastered: number;
  problemCount: number;
}

export interface Mastery {
  perPattern: PatternMastery[];
  tiers: Record<Tier, TierRollup>;
  dueToday: number;
  streakDays: number;
  totalReviews: number;
}

const TIERS: Tier[] = ["core", "intermediate", "stretch"];

/**
 * Aggregate the user's progress over the TOOLKIT syllabus.
 *
 * `todayDay` defaults to the current UTC epoch day. All date comparisons use
 * ISO yyyy-mm-dd strings, which is how `due_at` / `reviewed_on` are stored.
 *
 * Efficiency: we fetch published problems once and the user's srs_state rows
 * (joined to published problems for their pattern) once, then aggregate in
 * memory — no per-pattern queries.
 */
export async function getMastery(userId: string, todayDay: number = epochDay()): Promise<Mastery> {
  await initDb();

  // Published problems with a pattern → problemCount per pattern key.
  const problemsRes = await db.execute({
    sql: "SELECT pattern FROM problems WHERE published = 1 AND pattern IS NOT NULL",
    args: [],
  });
  const problemCountByPattern = new Map<string, number>();
  for (const row of problemsRes.rows) {
    const key = row.pattern as string;
    problemCountByPattern.set(key, (problemCountByPattern.get(key) ?? 0) + 1);
  }

  // The user's srs_state rows joined to published problems, so we know each
  // attempted problem's pattern and can apply the mastered rule in memory.
  const srsRes = await db.execute({
    sql: `SELECT p.pattern AS pattern, s.interval_days AS interval_days,
                 s.reps AS reps, s.last_grade AS last_grade, s.due_at AS due_at
          FROM srs_state s
          JOIN problems p ON p.id = s.problem_id
          WHERE s.user_id = ? AND p.published = 1 AND p.pattern IS NOT NULL`,
    args: [userId],
  });

  const attemptedByPattern = new Map<string, number>();
  const masteredByPattern = new Map<string, number>();
  const todayISO = dayToISO(todayDay);
  let dueToday = 0;

  for (const row of srsRes.rows) {
    const key = row.pattern as string;
    attemptedByPattern.set(key, (attemptedByPattern.get(key) ?? 0) + 1);

    const interval = Number(row.interval_days);
    const reps = Number(row.reps);
    const lastGrade = row.last_grade == null ? null : Number(row.last_grade);

    // mastered: interval_days >= 21 OR (reps >= 3 AND last_grade >= 2).
    const mastered = interval >= 21 || (reps >= 3 && lastGrade != null && lastGrade >= 2);
    if (mastered) masteredByPattern.set(key, (masteredByPattern.get(key) ?? 0) + 1);

    // dueToday: due_at IS NOT NULL AND due_at <= today's ISO.
    const dueAt = row.due_at as string | null;
    if (dueAt != null && dueAt <= todayISO) dueToday += 1;
  }

  // Per-pattern, in PATTERNS order so the syllabus is always fully represented.
  const perPattern: PatternMastery[] = PATTERNS.map((p) => ({
    key: p.key,
    label: p.label,
    kind: p.kind,
    tier: p.tier,
    problemCount: problemCountByPattern.get(p.key) ?? 0,
    attempted: attemptedByPattern.get(p.key) ?? 0,
    mastered: masteredByPattern.get(p.key) ?? 0,
  }));

  // Tier rollups. `patterns` counts only content-bearing patterns
  // (problemCount > 0); the other fields sum across all patterns in the tier.
  const tiers = Object.fromEntries(
    TIERS.map((t) => [t, { patterns: 0, attempted: 0, mastered: 0, problemCount: 0 }]),
  ) as Record<Tier, TierRollup>;

  for (const pm of perPattern) {
    const roll = tiers[pm.tier];
    if (pm.problemCount > 0) roll.patterns += 1;
    roll.attempted += pm.attempted;
    roll.mastered += pm.mastered;
    roll.problemCount += pm.problemCount;
  }

  // totalReviews: all reviews for the user.
  const reviewCountRes = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM reviews WHERE user_id = ?",
    args: [userId],
  });
  const totalReviews = Number(reviewCountRes.rows[0].n);

  // streakDays: consecutive days ending at todayDay with >=1 review. Strict on
  // today — if todayDay itself has no review the streak is 0, even if
  // todayDay-1 does. We count down day-by-day, stopping at the first absent day.
  const reviewDaysRes = await db.execute({
    sql: "SELECT DISTINCT reviewed_on FROM reviews WHERE user_id = ?",
    args: [userId],
  });
  const reviewDays = new Set<number>(
    reviewDaysRes.rows.map((r) => isoToDay(r.reviewed_on as string)),
  );
  let streakDays = 0;
  for (let day = todayDay; reviewDays.has(day); day -= 1) streakDays += 1;

  return { perPattern, tiers, dueToday, streakDays, totalReviews };
}
