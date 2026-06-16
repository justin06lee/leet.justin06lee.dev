import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import { createProblem } from "./problems";
import { dayToISO } from "./day";
import { getMastery } from "./mastery";

const TODAY = 20000;

// Insert an srs_state row directly for determinism.
async function insertSrs(
  userId: string,
  problemId: string,
  fields: { intervalDays?: number; reps?: number; lastGrade?: number | null; dueDay?: number | null },
): Promise<void> {
  await db.execute({
    sql: `INSERT INTO srs_state (user_id, problem_id, interval_days, reps, last_grade, due_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      problemId,
      fields.intervalDays ?? 0,
      fields.reps ?? 0,
      fields.lastGrade ?? null,
      fields.dueDay == null ? null : dayToISO(fields.dueDay),
    ],
  });
}

// stdio judging mode avoids the function_name requirement.
function mkProblem(pattern: string) {
  return createProblem({ title: randomUUID(), pattern, published: true, judgingMode: "stdio" });
}

async function insertReview(userId: string, problemId: string, day: number): Promise<void> {
  await db.execute({
    sql: `INSERT INTO reviews (id, user_id, problem_id, grade, reviewed_on)
          VALUES (?, ?, ?, ?, ?)`,
    args: [randomUUID(), userId, problemId, 3, dayToISO(day)],
  });
}

describe("getMastery — perPattern", () => {
  it("counts problemCount, attempted, mastered for a pattern", async () => {
    await initDb();
    const user = randomUUID();

    // "trie" (core) is used by no other test here, so its global problemCount
    // is deterministic regardless of test ordering.
    const p1 = await mkProblem("trie");
    await mkProblem("trie");

    // One attempted + mastered via interval_days >= 21.
    await insertSrs(user, p1.id, { intervalDays: 30, reps: 1, lastGrade: 2 });

    const m = await getMastery(user, TODAY);
    const trie = m.perPattern.find((p) => p.key === "trie")!;
    expect(trie.problemCount).toBe(2);
    expect(trie.attempted).toBe(1);
    expect(trie.mastered).toBe(1);
  });

  it("applies the mastered rule exactly (reps>=3 AND last_grade>=2 vs not)", async () => {
    await initDb();
    const user = randomUUID();

    // "stack" (core) is used by no other test here.
    const masteredProb = await mkProblem("stack");
    const notMastered = await mkProblem("stack");

    // reps 3 + last_grade 2 (interval 5) → mastered.
    await insertSrs(user, masteredProb.id, { intervalDays: 5, reps: 3, lastGrade: 2 });
    // reps 2 + last_grade 4 (interval 5) → NOT mastered.
    await insertSrs(user, notMastered.id, { intervalDays: 5, reps: 2, lastGrade: 4 });

    const m = await getMastery(user, TODAY);
    const str = m.perPattern.find((p) => p.key === "stack")!;
    expect(str.problemCount).toBe(2);
    expect(str.attempted).toBe(2);
    expect(str.mastered).toBe(1);
  });

  it("includes every PATTERNS key even with no problems", async () => {
    await initDb();
    const user = randomUUID();
    const m = await getMastery(user, TODAY);
    expect(m.perPattern.length).toBeGreaterThan(50);
    const empty = m.perPattern.find((p) => p.key === "kd-tree")!;
    expect(empty.problemCount).toBe(0);
    expect(empty.attempted).toBe(0);
    expect(empty.mastered).toBe(0);
  });
});

describe("getMastery — tier rollups", () => {
  it("sums across patterns in a tier and counts only content-bearing patterns", async () => {
    await initDb();
    const user = randomUUID();

    // Intermediate tier patterns: "greedy" and "dijkstra".
    const g1 = await mkProblem("greedy");
    await mkProblem("greedy");
    const d1 = await mkProblem("dijkstra");

    await insertSrs(user, g1.id, { intervalDays: 30 }); // attempted + mastered
    await insertSrs(user, d1.id, { intervalDays: 1, reps: 1, lastGrade: 1 }); // attempted, not mastered

    const m = await getMastery(user, TODAY);
    const inter = m.tiers.intermediate;
    // greedy(2) + dijkstra(1) = 3 problems, 2 content-bearing patterns.
    expect(inter.problemCount).toBe(3);
    expect(inter.patterns).toBe(2);
    expect(inter.attempted).toBe(2);
    expect(inter.mastered).toBe(1);
  });
});

describe("getMastery — dueToday", () => {
  it("counts rows due yesterday/today but not tomorrow", async () => {
    await initDb();
    const user = randomUUID();
    const a = await mkProblem("array");
    const b = await mkProblem("array");
    const c = await mkProblem("array");
    const d = await mkProblem("array");

    await insertSrs(user, a.id, { dueDay: TODAY - 1 });
    await insertSrs(user, b.id, { dueDay: TODAY });
    await insertSrs(user, c.id, { dueDay: TODAY + 1 });
    await insertSrs(user, d.id, { dueDay: null }); // never due

    const m = await getMastery(user, TODAY);
    expect(m.dueToday).toBe(2);
  });
});

describe("getMastery — totalReviews", () => {
  it("matches inserted review count for the user", async () => {
    await initDb();
    const user = randomUUID();
    const other = randomUUID();
    const p = await mkProblem("array");

    await insertReview(user, p.id, TODAY);
    await insertReview(user, p.id, TODAY - 1);
    await insertReview(other, p.id, TODAY); // different user, ignored

    const m = await getMastery(user, TODAY);
    expect(m.totalReviews).toBe(2);
  });
});

describe("getMastery — streakDays", () => {
  it("counts consecutive days ending at today", async () => {
    await initDb();
    const user = randomUUID();
    const p = await mkProblem("array");

    await insertReview(user, p.id, TODAY);
    await insertReview(user, p.id, TODAY - 1);
    await insertReview(user, p.id, TODAY - 2);

    const m = await getMastery(user, TODAY);
    expect(m.streakDays).toBe(3);
  });

  it("is strict on today: a gap at today-1 with today present → 1", async () => {
    await initDb();
    const user = randomUUID();
    const p = await mkProblem("array");

    await insertReview(user, p.id, TODAY);
    // gap: no review on TODAY-1
    await insertReview(user, p.id, TODAY - 2);

    const m = await getMastery(user, TODAY);
    expect(m.streakDays).toBe(1);
  });

  it("is 0 when today has no review even if yesterday does", async () => {
    await initDb();
    const user = randomUUID();
    const p = await mkProblem("array");

    await insertReview(user, p.id, TODAY - 1);
    await insertReview(user, p.id, TODAY - 2);

    const m = await getMastery(user, TODAY);
    expect(m.streakDays).toBe(0);
  });
});
