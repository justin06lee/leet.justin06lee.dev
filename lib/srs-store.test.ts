import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import { getSrsState, recordReview, getDueProblemIds } from "./srs-store";

const TODAY = 20000;

async function countSrsState(userId: string, problemId: string): Promise<number> {
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM srs_state WHERE user_id = ? AND problem_id = ?",
    args: [userId, problemId],
  });
  return Number(res.rows[0].n);
}

async function countReviews(userId: string, problemId: string): Promise<number> {
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND problem_id = ?",
    args: [userId, problemId],
  });
  return Number(res.rows[0].n);
}

describe("recordReview", () => {
  it("records a fresh review and persists matching state", async () => {
    await initDb();
    const user = randomUUID();
    const problem = randomUUID();

    const next = await recordReview(user, problem, 2, TODAY);
    expect(next.reps).toBe(1);
    expect(next.lastGrade).toBe(2);
    expect(next.dueDay).toBe(TODAY + next.intervalDays);

    const fetched = await getSrsState(user, problem);
    expect(fetched).not.toBeNull();
    expect(fetched).toEqual(next);

    expect(await countReviews(user, problem)).toBe(1);
    expect(await countSrsState(user, problem)).toBe(1);
  });

  it("updates the existing srs_state row instead of duplicating it", async () => {
    await initDb();
    const user = randomUUID();
    const problem = randomUUID();

    await recordReview(user, problem, 3, TODAY);
    const second = await recordReview(user, problem, 3, TODAY + 5);

    expect(second.reps).toBe(2);
    expect(await countSrsState(user, problem)).toBe(1);
    expect(await countReviews(user, problem)).toBe(2);

    const fetched = await getSrsState(user, problem);
    expect(fetched!.reps).toBe(2);
  });
});

describe("getSrsState", () => {
  it("returns null for an unrecorded pair", async () => {
    await initDb();
    const state = await getSrsState(randomUUID(), randomUUID());
    expect(state).toBeNull();
  });
});

describe("getDueProblemIds", () => {
  it("returns a problem only on/after its due day", async () => {
    await initDb();
    const user = randomUUID();
    const problem = randomUUID();

    // grade 2, fresh → interval 1 → due TODAY+1
    const next = await recordReview(user, problem, 2, TODAY);
    expect(next.intervalDays).toBe(1);
    expect(next.dueDay).toBe(TODAY + 1);

    expect(await getDueProblemIds(user, TODAY)).not.toContain(problem);
    expect(await getDueProblemIds(user, TODAY + 1)).toContain(problem);
  });

  it("handles a lapse (grade 0) with interval 1 → due next day", async () => {
    await initDb();
    const user = randomUUID();
    const problem = randomUUID();

    const next = await recordReview(user, problem, 0, TODAY);
    expect(next.intervalDays).toBe(1);
    expect(next.dueDay).toBe(TODAY + 1);

    expect(await getDueProblemIds(user, TODAY)).not.toContain(problem);
    expect(await getDueProblemIds(user, TODAY + 1)).toContain(problem);
  });

  it("scopes due lookups to the given user", async () => {
    await initDb();
    const user = randomUUID();
    const other = randomUUID();
    const problem = randomUUID();

    await recordReview(user, problem, 2, TODAY);
    const due = await getDueProblemIds(user, TODAY + 1);
    expect(due).toEqual([problem]);
    expect(await getDueProblemIds(other, TODAY + 1)).toEqual([]);
  });
});
