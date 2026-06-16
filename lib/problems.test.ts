import { describe, it, expect } from "vitest";
import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import {
  createProblem,
  updateProblem,
  getProblemBySlug,
  listProblems,
  deleteProblem,
  getTests,
  replaceTests,
} from "./problems";

describe("createProblem / getProblemBySlug", () => {
  it("creates a function-mode problem and round-trips params + starterCode", async () => {
    await initDb();
    const created = await createProblem({
      title: "Two Sum",
      statement: "find two numbers",
      pattern: "hash-map",
      functionName: "twoSum",
      params: [{ name: "nums", type: "int[]" }],
      returnType: "int[]",
      starterCode: { python: "def twoSum(): pass", javascript: "function twoSum(){}" },
    });
    expect(created.judgingMode).toBe("function");

    const fetched = await getProblemBySlug("two-sum", { includeUnpublished: true });
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe("Two Sum");
    expect(fetched!.judgingMode).toBe("function");
    expect(fetched!.params).toEqual([{ name: "nums", type: "int[]" }]);
    expect(fetched!.starterCode).toEqual({
      python: "def twoSum(): pass",
      javascript: "function twoSum(){}",
    });
  });

  it("creates a stdio-mode problem without a functionName", async () => {
    await initDb();
    const created = await createProblem({
      title: "Echo Lines",
      judgingMode: "stdio",
    });
    expect(created.judgingMode).toBe("stdio");

    const fetched = await getProblemBySlug("echo-lines", { includeUnpublished: true });
    expect(fetched!.judgingMode).toBe("stdio");
  });

  it("throws when function mode has no functionName", async () => {
    await initDb();
    await expect(
      createProblem({ title: "No Fn", judgingMode: "function" }),
    ).rejects.toThrow(/function_name/);
  });

  it("throws on invalid difficulty", async () => {
    await initDb();
    await expect(
      // @ts-expect-error invalid difficulty
      createProblem({ title: "Bad Diff", functionName: "f", difficulty: "trivial" }),
    ).rejects.toThrow();
  });

  it("hides unpublished problems unless includeUnpublished", async () => {
    await initDb();
    await createProblem({ title: "Hidden Prob", functionName: "f" });
    expect(await getProblemBySlug("hidden-prob")).toBeNull();
    expect(
      await getProblemBySlug("hidden-prob", { includeUnpublished: true }),
    ).not.toBeNull();
  });

  it("returns [] params when the stored JSON is malformed", async () => {
    await initDb();
    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO problems (id, slug, title, statement, difficulty, judging_mode, function_name, params, published)
            VALUES (?, ?, ?, ?, 'medium', 'function', 'f', '{not json', 1)`,
      args: [id, "malformed-params", "Malformed", "x"],
    });
    const fetched = await getProblemBySlug("malformed-params", { includeUnpublished: true });
    expect(fetched).not.toBeNull();
    expect(fetched!.params).toEqual([]);
  });
});

describe("listProblems", () => {
  it("filters by pattern", async () => {
    await initDb();
    await createProblem({ title: "Pattern A", functionName: "f", pattern: "stack", published: true });
    await createProblem({ title: "Pattern B", functionName: "f", pattern: "queue", published: true });
    const list = await listProblems({ pattern: "stack", includeUnpublished: true });
    expect(list.every((p) => p.pattern === "stack")).toBe(true);
    expect(list.some((p) => p.slug === "pattern-a")).toBe(true);
    expect(list.some((p) => p.slug === "pattern-b")).toBe(false);
  });

  it("filters by difficulty", async () => {
    await initDb();
    await createProblem({ title: "Easy One", functionName: "f", difficulty: "easy", published: true });
    await createProblem({ title: "Hard One", functionName: "f", difficulty: "hard", published: true });
    const list = await listProblems({ difficulty: "easy", includeUnpublished: true });
    expect(list.every((p) => p.difficulty === "easy")).toBe(true);
    expect(list.some((p) => p.slug === "easy-one")).toBe(true);
    expect(list.some((p) => p.slug === "hard-one")).toBe(false);
  });

  it("filters by tier derived from the pattern syllabus", async () => {
    await initDb();
    await createProblem({ title: "Core Tier", functionName: "f", pattern: "hash-map", published: true });
    await createProblem({ title: "Stretch Tier", functionName: "f", pattern: "manacher", published: true });
    const list = await listProblems({ tier: "core", includeUnpublished: true });
    expect(list.some((p) => p.slug === "core-tier")).toBe(true);
    expect(list.some((p) => p.slug === "stretch-tier")).toBe(false);
  });
});

describe("replaceTests / getTests", () => {
  it("replaces tests and filters hidden cases by default", async () => {
    await initDb();
    const prob = await createProblem({ title: "With Tests", functionName: "f" });
    await replaceTests(prob.id, [
      { ordinal: 0, kind: "visible", input: "a", expected: "1" },
      { ordinal: 0, kind: "hidden", input: "b", expected: "2" },
      { ordinal: 0, kind: "visible", input: "c", expected: "3" },
    ]);

    const visible = await getTests(prob.id);
    expect(visible.every((t) => t.kind === "visible")).toBe(true);
    expect(visible.map((t) => t.input)).toEqual(["a", "c"]);

    const all = await getTests(prob.id, { includeHidden: true });
    expect(all.map((t) => t.input)).toEqual(["a", "b", "c"]);
    expect(all.map((t) => t.ordinal)).toEqual([0, 1, 2]);
  });
});

describe("deleteProblem", () => {
  it("removes the problem and its tests", async () => {
    await initDb();
    const prob = await createProblem({ title: "Doomed Prob", functionName: "f" });
    await replaceTests(prob.id, [{ ordinal: 0, kind: "visible", input: "a", expected: "1" }]);
    await deleteProblem(prob.id);
    expect(await getProblemBySlug(prob.slug, { includeUnpublished: true })).toBeNull();
    expect(await getTests(prob.id, { includeHidden: true })).toEqual([]);
  });
});

describe("updateProblem", () => {
  it("updates fields and re-validates", async () => {
    await initDb();
    const prob = await createProblem({ title: "Updatable", functionName: "f", published: false });
    const updated = await updateProblem(prob.id, { published: true, title: "Updated Title" });
    expect(updated.published).toBe(true);
    expect(updated.title).toBe("Updated Title");
  });
});
