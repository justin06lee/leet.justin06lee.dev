import { randomUUID } from "crypto";
import type { Row } from "@libsql/client";
import { db, initDb } from "./db";
import { slugify, uniqueSlug } from "./slug";
import { getPattern, type Tier } from "./toolkit";

export type JudgingMode = "function" | "stdio";
export type Difficulty = "easy" | "medium" | "hard";

export interface ProblemParam {
  name: string;
  type: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  statement: string;
  pattern: string | null;
  difficulty: Difficulty;
  judgingMode: JudgingMode;
  functionName: string | null;
  params: ProblemParam[];
  returnType: string | null;
  starterCode: Record<string, string>;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemTest {
  id: string;
  problemId: string;
  ordinal: number;
  kind: "visible" | "hidden";
  input: string;
  expected: string;
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const JUDGING_MODES: JudgingMode[] = ["function", "stdio"];
const TEST_KINDS: ProblemTest["kind"][] = ["visible", "hidden"];

export function isTestKind(value: unknown): value is ProblemTest["kind"] {
  return typeof value === "string" && (TEST_KINDS as string[]).includes(value);
}

export function mapProblemRow(row: Row): Problem {
  let params: ProblemParam[] = [];
  try {
    const raw = row.params as string | null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) params = parsed;
    }
  } catch {
    params = [];
  }

  let starterCode: Record<string, string> = {};
  try {
    const raw = row.starter_code as string | null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        starterCode = parsed;
      }
    }
  } catch {
    starterCode = {};
  }

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    statement: (row.statement as string | null) ?? "",
    pattern: (row.pattern as string | null) ?? null,
    difficulty: row.difficulty as Difficulty,
    judgingMode: row.judging_mode as JudgingMode,
    functionName: (row.function_name as string | null) ?? null,
    params,
    returnType: (row.return_type as string | null) ?? null,
    starterCode,
    published: Number(row.published) === 1,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function validateDifficulty(value: Difficulty | undefined): Difficulty {
  const difficulty = value ?? "medium";
  if (!DIFFICULTIES.includes(difficulty)) {
    throw new Error(`invalid difficulty: ${difficulty}`);
  }
  return difficulty;
}

function validateJudgingMode(value: JudgingMode | undefined): JudgingMode {
  const mode = value ?? "function";
  if (!JUDGING_MODES.includes(mode)) {
    throw new Error(`invalid judging_mode: ${mode}`);
  }
  return mode;
}

function validateFunctionName(mode: JudgingMode, functionName: string | null | undefined): void {
  if (mode === "function" && (typeof functionName !== "string" || functionName.length === 0)) {
    throw new Error("function mode requires function_name");
  }
}

// True for errors thrown by the validators above — API routes map these to
// 400 (bad input) instead of letting them surface as 500s.
export function isProblemValidationError(e: unknown): e is Error {
  return e instanceof Error && /^(invalid |function mode requires )/.test(e.message);
}

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const res = excludeId
    ? await db.execute({
        sql: "SELECT 1 FROM problems WHERE slug = ? AND id != ? LIMIT 1",
        args: [slug, excludeId],
      })
    : await db.execute({
        sql: "SELECT 1 FROM problems WHERE slug = ? LIMIT 1",
        args: [slug],
      });
  return res.rows.length > 0;
}

export async function createProblem(input: {
  title: string;
  statement?: string;
  pattern?: string | null;
  difficulty?: Difficulty;
  judgingMode?: JudgingMode;
  functionName?: string | null;
  params?: ProblemParam[];
  returnType?: string | null;
  starterCode?: Record<string, string>;
  slug?: string;
  published?: boolean;
}): Promise<Problem> {
  await initDb();

  const difficulty = validateDifficulty(input.difficulty);
  const judgingMode = validateJudgingMode(input.judgingMode);
  validateFunctionName(judgingMode, input.functionName);

  const id = randomUUID();
  const base = slugify(input.slug ?? input.title);
  const slug = await uniqueSlug(base, (s) => slugExists(s));

  await db.execute({
    sql: `INSERT INTO problems
            (id, slug, title, statement, pattern, difficulty, judging_mode,
             function_name, params, return_type, starter_code, published)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      slug,
      input.title,
      input.statement ?? "",
      input.pattern ?? null,
      difficulty,
      judgingMode,
      input.functionName ?? null,
      JSON.stringify(input.params ?? []),
      input.returnType ?? null,
      JSON.stringify(input.starterCode ?? {}),
      input.published ? 1 : 0,
    ],
  });

  const res = await db.execute({ sql: "SELECT * FROM problems WHERE id = ?", args: [id] });
  return mapProblemRow(res.rows[0]);
}

const COLUMN: Record<string, string> = {
  title: "title",
  statement: "statement",
  pattern: "pattern",
  difficulty: "difficulty",
  judgingMode: "judging_mode",
  functionName: "function_name",
  params: "params",
  returnType: "return_type",
  starterCode: "starter_code",
  slug: "slug",
  published: "published",
};

export async function updateProblem(
  id: string,
  patch: Partial<{
    title: string;
    statement: string;
    pattern: string | null;
    difficulty: Difficulty;
    judgingMode: JudgingMode;
    functionName: string | null;
    params: ProblemParam[];
    returnType: string | null;
    starterCode: Record<string, string>;
    slug: string;
    published: boolean;
  }>,
): Promise<Problem> {
  await initDb();

  const current = await db.execute({ sql: "SELECT * FROM problems WHERE id = ?", args: [id] });
  if (current.rows.length === 0) throw new Error(`problem not found: ${id}`);
  const existing = mapProblemRow(current.rows[0]);

  // Resolve effective values for validation.
  validateDifficulty("difficulty" in patch ? patch.difficulty : existing.difficulty);
  const judgingMode = validateJudgingMode(
    "judgingMode" in patch ? patch.judgingMode : existing.judgingMode,
  );
  const functionName = "functionName" in patch ? patch.functionName : existing.functionName;
  validateFunctionName(judgingMode, functionName);

  const sets: string[] = [];
  const args: (string | number | null)[] = [];

  for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
    if (!(key in COLUMN)) continue;
    if (key === "slug") {
      const base = slugify(patch.slug as string);
      const slug = await uniqueSlug(base, (s) => slugExists(s, id));
      sets.push("slug = ?");
      args.push(slug);
    } else if (key === "published") {
      sets.push("published = ?");
      args.push(patch.published ? 1 : 0);
    } else if (key === "params") {
      sets.push("params = ?");
      args.push(JSON.stringify(patch.params ?? []));
    } else if (key === "starterCode") {
      sets.push("starter_code = ?");
      args.push(JSON.stringify(patch.starterCode ?? {}));
    } else {
      sets.push(`${COLUMN[key]} = ?`);
      args.push((patch[key] as string | null) ?? null);
    }
  }

  sets.push("updated_at = datetime('now')");

  await db.execute({
    sql: `UPDATE problems SET ${sets.join(", ")} WHERE id = ?`,
    args: [...args, id],
  });

  const res = await db.execute({ sql: "SELECT * FROM problems WHERE id = ?", args: [id] });
  return mapProblemRow(res.rows[0]);
}

export async function getProblemBySlug(
  slug: string,
  opts?: { includeUnpublished?: boolean },
): Promise<Problem | null> {
  await initDb();
  const sql = opts?.includeUnpublished
    ? "SELECT * FROM problems WHERE slug = ?"
    : "SELECT * FROM problems WHERE slug = ? AND published = 1";
  const res = await db.execute({ sql, args: [slug] });
  if (res.rows.length === 0) return null;
  return mapProblemRow(res.rows[0]);
}

export async function getProblemById(id: string): Promise<Problem | null> {
  await initDb();
  const res = await db.execute({ sql: "SELECT * FROM problems WHERE id = ?", args: [id] });
  if (res.rows.length === 0) return null;
  return mapProblemRow(res.rows[0]);
}

export async function listProblems(filters?: {
  pattern?: string;
  tier?: Tier;
  difficulty?: Difficulty;
  includeUnpublished?: boolean;
}): Promise<Problem[]> {
  await initDb();

  const where: string[] = [];
  const args: (string | number)[] = [];

  if (filters?.pattern !== undefined) {
    where.push("pattern = ?");
    args.push(filters.pattern);
  }
  if (filters?.difficulty !== undefined) {
    where.push("difficulty = ?");
    args.push(filters.difficulty);
  }
  if (!filters?.includeUnpublished) {
    where.push("published = 1");
  }

  const sql =
    "SELECT * FROM problems" +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    " ORDER BY updated_at DESC";

  const res = await db.execute({ sql, args });
  let problems = res.rows.map(mapProblemRow);

  if (filters?.tier !== undefined) {
    problems = problems.filter(
      (p) => p.pattern !== null && getPattern(p.pattern)?.tier === filters.tier,
    );
  }

  return problems;
}

export async function deleteProblem(id: string): Promise<void> {
  await initDb();
  await db.batch([
    { sql: "DELETE FROM problem_tests WHERE problem_id = ?", args: [id] },
    { sql: "DELETE FROM problems WHERE id = ?", args: [id] },
  ]);
}

export async function getTests(
  problemId: string,
  opts?: { includeHidden?: boolean },
): Promise<ProblemTest[]> {
  await initDb();
  const sql = opts?.includeHidden
    ? "SELECT * FROM problem_tests WHERE problem_id = ? ORDER BY ordinal ASC"
    : "SELECT * FROM problem_tests WHERE problem_id = ? AND kind = 'visible' ORDER BY ordinal ASC";
  const res = await db.execute({ sql, args: [problemId] });
  return res.rows.map((row) => ({
    id: row.id as string,
    problemId: row.problem_id as string,
    ordinal: Number(row.ordinal),
    kind: row.kind as "visible" | "hidden",
    input: (row.input as string | null) ?? "",
    expected: (row.expected as string | null) ?? "",
  }));
}

export async function replaceTests(
  problemId: string,
  tests: Omit<ProblemTest, "id" | "problemId">[],
): Promise<void> {
  await initDb();
  for (const test of tests) {
    if (!isTestKind(test.kind)) throw new Error(`invalid test kind: ${test.kind}`);
  }
  const statements = [
    { sql: "DELETE FROM problem_tests WHERE problem_id = ?", args: [problemId] as (string | number)[] },
    ...tests.map((test, index) => ({
      sql: `INSERT INTO problem_tests (id, problem_id, ordinal, kind, input, expected)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [randomUUID(), problemId, index, test.kind, test.input, test.expected] as (
        | string
        | number
      )[],
    })),
  ];
  await db.batch(statements);
}
