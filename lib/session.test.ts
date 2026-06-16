import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import { dayToISO } from "./day";
import { createProblem } from "./problems";
import { recordReview } from "./srs-store";
import { buildDailySession } from "./session";

const TODAY = 20000;

// stdio mode avoids the function-mode requirement for a functionName.
function seed(input: { title: string; pattern?: string; published: boolean }) {
  return createProblem({ ...input, judgingMode: "stdio" });
}

// Directly schedule a problem with an explicit due day, bypassing the
// scheduler so tests can place a problem before/after "today".
async function scheduleDue(userId: string, problemId: string, dueDay: number): Promise<void> {
  await initDb();
  await db.execute({
    sql: `INSERT INTO srs_state
            (user_id, problem_id, ease, interval_days, due_at, reps, lapses, last_grade, updated_at)
          VALUES (?, ?, 2.5, 1, ?, 1, 0, 2, datetime('now'))`,
    args: [userId, problemId, dayToISO(dueDay)],
  });
}

describe("buildDailySession", () => {
  it("includes a problem due <= today as a review item", async () => {
    await initDb();
    const user = randomUUID();
    const a = await seed({ title: "Due A", published: true });
    await seed({ title: "B", published: true });
    await seed({ title: "C", published: true });

    // Record a review on an earlier day so A becomes due on/before today.
    await recordReview(user, a.id, 2, TODAY - 30);

    const { items } = await buildDailySession(user, { todayDay: TODAY });
    const review = items.find((i) => i.problem.id === a.id);
    expect(review).toBeDefined();
    expect(review!.kind).toBe("review");
  });

  it("does not include a problem due tomorrow in reviews", async () => {
    await initDb();
    const user = randomUUID();
    const p = await seed({ title: "Tomorrow", published: true });
    await scheduleDue(user, p.id, TODAY + 1);

    const { items } = await buildDailySession(user, { todayDay: TODAY });
    const found = items.find((i) => i.problem.id === p.id);
    // Scheduled, so not "new"; due tomorrow, so not a "review" today.
    expect(found).toBeUndefined();
  });

  it("surfaces unscheduled published problems as new, excluding scheduled ones", async () => {
    await initDb();
    const user = randomUUID();
    const scheduled = await seed({ title: "Scheduled", published: true });
    const fresh = await seed({ title: "Fresh", published: true });
    await scheduleDue(user, scheduled.id, TODAY + 10); // scheduled, not due

    const { items } = await buildDailySession(user, { todayDay: TODAY });
    const news = items.filter((i) => i.kind === "new").map((i) => i.problem.id);
    expect(news).toContain(fresh.id);
    expect(news).not.toContain(scheduled.id);
  });

  it("respects newLimit", async () => {
    await initDb();
    const user = randomUUID();
    await seed({ title: "New 1", published: true });
    await seed({ title: "New 2", published: true });

    const { items } = await buildDailySession(user, { todayDay: TODAY, newLimit: 1 });
    const news = items.filter((i) => i.kind === "new");
    expect(news).toHaveLength(1);
  });

  it("respects reviewLimit", async () => {
    await initDb();
    const user = randomUUID();
    const p1 = await seed({ title: "Rev 1", published: true });
    const p2 = await seed({ title: "Rev 2", published: true });
    const p3 = await seed({ title: "Rev 3", published: true });
    await scheduleDue(user, p1.id, TODAY - 3);
    await scheduleDue(user, p2.id, TODAY - 2);
    await scheduleDue(user, p3.id, TODAY - 1);

    const { items } = await buildDailySession(user, { todayDay: TODAY, reviewLimit: 2 });
    const reviews = items.filter((i) => i.kind === "review");
    expect(reviews).toHaveLength(2);
  });

  it("never includes unpublished problems", async () => {
    await initDb();
    const user = randomUUID();
    const hidden = await seed({ title: "Hidden", published: false });
    // Even if scheduled and due, an unpublished problem must not appear.
    await scheduleDue(user, hidden.id, TODAY - 1);

    const { items } = await buildDailySession(user, { todayDay: TODAY });
    expect(items.find((i) => i.problem.id === hidden.id)).toBeUndefined();
  });

  it("orders new problems by pattern tier (core before stretch)", async () => {
    await initDb();
    const user = randomUUID();
    // Create the stretch one FIRST so insertion order alone would not yield
    // core-before-stretch; the tier sort must.
    const stretch = await seed({
      title: "Stretch",
      pattern: "manacher",
      published: true,
    });
    const core = await seed({
      title: "Core",
      pattern: "hash-map",
      published: true,
    });

    const { items } = await buildDailySession(user, { todayDay: TODAY });
    const news = items.filter((i) => i.kind === "new").map((i) => i.problem.id);
    const coreIdx = news.indexOf(core.id);
    const stretchIdx = news.indexOf(stretch.id);
    expect(coreIdx).toBeGreaterThanOrEqual(0);
    expect(stretchIdx).toBeGreaterThanOrEqual(0);
    expect(coreIdx).toBeLessThan(stretchIdx);
  });
});
