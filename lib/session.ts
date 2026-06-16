import { db, initDb } from "./db";
import { dayToISO, epochDay } from "./day";
import { listProblems, type Problem } from "./problems";
import { getPattern, type Tier } from "./toolkit";

export interface SessionItem {
  problem: Problem;
  kind: "review" | "new";
}

// Tier ranks for ordering new problems. Lower comes first; unknown/null tier
// sorts last.
const TIER_RANK: Record<Tier, number> = { core: 0, intermediate: 1, stretch: 2 };
const UNKNOWN_TIER_RANK = 3;

function tierRank(problem: Problem): number {
  if (problem.pattern === null) return UNKNOWN_TIER_RANK;
  const tier = getPattern(problem.pattern)?.tier;
  return tier ? TIER_RANK[tier] : UNKNOWN_TIER_RANK;
}

/**
 * Assemble a user's daily practice session.
 *
 * Ordering of the returned `items`:
 *   1. Due reviews first (kind "review"), ordered by due date ascending
 *      (soonest-overdue first), capped at `reviewLimit`.
 *   2. New, never-scheduled problems (kind "new"), ordered by pattern tier
 *      (core -> intermediate -> stretch, unknown/null tier last) and, within a
 *      tier, preserving `listProblems`' order (updated_at DESC). Capped at
 *      `newLimit`.
 *
 * Only published problems are ever included.
 */
export async function buildDailySession(
  userId: string,
  opts?: { todayDay?: number; newLimit?: number; reviewLimit?: number },
): Promise<{ items: SessionItem[] }> {
  await initDb();

  const todayDay = opts?.todayDay ?? epochDay();
  const newLimit = opts?.newLimit ?? 5;
  const reviewLimit = opts?.reviewLimit ?? 20;

  // All published problems, keyed by id, in listProblems' order (updated_at DESC).
  const all = await listProblems({});
  const byId = new Map(all.map((p) => [p.id, p]));

  // Reviews: scheduled problems due on/before today, ordered by due date asc.
  const dueRes = await db.execute({
    sql: `SELECT problem_id FROM srs_state
          WHERE user_id = ? AND due_at IS NOT NULL AND due_at <= ?
          ORDER BY due_at ASC`,
    args: [userId, dayToISO(todayDay)],
  });
  const reviews: SessionItem[] = [];
  for (const row of dueRes.rows) {
    const problem = byId.get(row.problem_id as string); // intersect with published
    if (problem) reviews.push({ problem, kind: "review" });
    if (reviews.length >= reviewLimit) break;
  }

  // New: published problems with NO srs_state row for this user.
  const scheduledRes = await db.execute({
    sql: "SELECT problem_id FROM srs_state WHERE user_id = ?",
    args: [userId],
  });
  const scheduledIds = new Set(scheduledRes.rows.map((r) => r.problem_id as string));

  // Stable sort by tier; keeps listProblems' order within a tier.
  const unscheduled = all
    .filter((p) => !scheduledIds.has(p.id))
    .sort((a, b) => tierRank(a) - tierRank(b));
  const news: SessionItem[] = unscheduled
    .slice(0, newLimit)
    .map((problem) => ({ problem, kind: "new" as const }));

  return { items: [...reviews, ...news] };
}
