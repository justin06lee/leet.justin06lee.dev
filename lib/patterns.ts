import { db, initDb } from "./db";
import { mapArticleRow, type Article } from "./articles";
import { mapProblemRow, type Problem } from "./problems";
import { PATTERNS, getPattern, type Pattern, type PatternKind, type Tier } from "./toolkit";

export const KINDS: { key: PatternKind; label: string }[] = [
  { key: "structure", label: "data structures" },
  { key: "technique", label: "techniques" },
];

export const TIERS: Tier[] = ["core", "intermediate", "stretch"];

/** One-line rationale per tier — the "know where to stop" promise, in the UI. */
export const TIER_BLURB: Record<Tier, string> = {
  core: "know cold. implement from memory, instant recognition. non-negotiable.",
  intermediate: "recognize the trigger, implement with light effort.",
  stretch: "know they exist and roughly when they apply. don't grind these.",
};

export interface PatternContent {
  pattern: Pattern;
  article: Article | null;
  problems: Problem[];
}

/** Patterns in syllabus order, grouped kind then tier — the curriculum spine. */
export function patternsByKindAndTier(kind: PatternKind, tier: Tier): Pattern[] {
  return PATTERNS.filter((p) => p.kind === kind && p.tier === tier);
}

/**
 * The previous/next pattern in syllabus order, so a lesson page can page
 * through the curriculum linearly. Ordered by PATTERNS itself, which is
 * already authored kind-then-tier.
 */
export function patternNeighbors(key: string): { prev: Pattern | null; next: Pattern | null } {
  const i = PATTERNS.findIndex((p) => p.key === key);
  if (i === -1) return { prev: null, next: null };
  return { prev: PATTERNS[i - 1] ?? null, next: PATTERNS[i + 1] ?? null };
}

/**
 * Everything the pattern hub renders: the teaching article and the problems
 * that drill it. Unpublished content is invisible to everyone — the admin
 * previews via the editor, not here.
 */
export async function getPatternContent(key: string): Promise<PatternContent | null> {
  const pattern = getPattern(key);
  if (!pattern) return null;

  await initDb();
  const [articleRes, problemsRes] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM articles WHERE pattern = ? AND published = 1 ORDER BY created_at ASC LIMIT 1",
      args: [key],
    }),
    db.execute({
      sql: "SELECT * FROM problems WHERE pattern = ? AND published = 1 ORDER BY created_at ASC",
      args: [key],
    }),
  ]);

  return {
    pattern,
    article: articleRes.rows[0] ? mapArticleRow(articleRes.rows[0]) : null,
    problems: problemsRes.rows.map(mapProblemRow),
  };
}

export interface PatternCoverage {
  /** Pattern keys that have a published teaching article. */
  taught: Set<string>;
  /** Published problem count per pattern key. */
  problemCounts: Map<string, number>;
}

/**
 * Which patterns actually have content, for the curriculum map. One pair of
 * queries for the whole syllabus rather than one per pattern.
 */
export async function getPatternCoverage(): Promise<PatternCoverage> {
  await initDb();
  const [articleRes, problemRes] = await Promise.all([
    db.execute({
      sql: "SELECT DISTINCT pattern FROM articles WHERE published = 1 AND pattern IS NOT NULL",
      args: [],
    }),
    db.execute({
      sql: `SELECT pattern, COUNT(*) AS n FROM problems
            WHERE published = 1 AND pattern IS NOT NULL GROUP BY pattern`,
      args: [],
    }),
  ]);

  return {
    taught: new Set(articleRes.rows.map((r) => r.pattern as string)),
    problemCounts: new Map(problemRes.rows.map((r) => [r.pattern as string, Number(r.n)])),
  };
}

/**
 * Reviews per day for a calendar year, keyed "YYYY-MM-DD" — the shape chrome's
 * heatmap wants. Days without reviews are simply absent; heatmap treats missing
 * keys as zero, so the sparse result needs no padding.
 */
export async function getReviewActivity(
  userId: string,
  year: number,
): Promise<Record<string, number>> {
  await initDb();
  const res = await db.execute({
    sql: `SELECT reviewed_on, COUNT(*) AS n FROM reviews
          WHERE user_id = ? AND reviewed_on >= ? AND reviewed_on <= ?
          GROUP BY reviewed_on`,
    args: [userId, `${year}-01-01`, `${year}-12-31`],
  });
  return Object.fromEntries(res.rows.map((r) => [r.reviewed_on as string, Number(r.n)]));
}
