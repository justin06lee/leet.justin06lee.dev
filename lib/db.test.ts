import { describe, it, expect } from "vitest";
import { db, initDb } from "./db";

describe("initDb", () => {
  it("creates users, sessions, and login_attempts tables", async () => {
    await initDb();
    const res = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tables = res.rows.map((r) => r.name as string);
    expect(tables).toContain("users");
    expect(tables).toContain("sessions");
    expect(tables).toContain("login_attempts");
  });

  it("creates articles, problems, and problem_tests tables", async () => {
    await initDb();
    const res = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    const tables = res.rows.map((r) => r.name as string);
    expect(tables).toContain("articles");
    expect(tables).toContain("problems");
    expect(tables).toContain("problem_tests");
  });

  it("is idempotent (safe to call twice)", async () => {
    await initDb();
    await initDb();
    const res = await db.execute("SELECT COUNT(*) AS n FROM users");
    expect(Number(res.rows[0].n)).toBe(0);
  });
});
