import { describe, expect, it } from "vitest";
import { compareCase, deepEqualJson, normalizeStdout } from "./compare";
import type { RawCaseOutput } from "./types";

function raw(over: Partial<RawCaseOutput> = {}): RawCaseOutput {
  return { got: null, stdout: "", error: null, timeMs: 1, ...over };
}

describe("deepEqualJson", () => {
  it("compares ints, strings, bools, null", () => {
    expect(deepEqualJson(1, 1)).toBe(true);
    expect(deepEqualJson("a", "a")).toBe(true);
    expect(deepEqualJson(true, true)).toBe(true);
    expect(deepEqualJson(null, null)).toBe(true);
    expect(deepEqualJson(1, 2)).toBe(false);
    expect(deepEqualJson("a", "b")).toBe(false);
    expect(deepEqualJson(true, false)).toBe(false);
  });

  it("fails on type mismatch", () => {
    expect(deepEqualJson(1, "1")).toBe(false);
    expect(deepEqualJson(null, 0)).toBe(false);
    expect(deepEqualJson([], {})).toBe(false);
    expect(deepEqualJson(true, 1)).toBe(false);
    expect(deepEqualJson({ a: 1 }, [1])).toBe(false);
  });

  it("applies float tolerance", () => {
    expect(deepEqualJson(0.1 + 0.2, 0.3)).toBe(true);
    expect(deepEqualJson(1, 2)).toBe(false);
    expect(deepEqualJson(1e-12, 0)).toBe(true);
    expect(deepEqualJson(1000000000, 1000000001)).toBe(true);
  });

  it("compares arrays order-sensitively", () => {
    expect(deepEqualJson([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqualJson([1, 2], [2, 1])).toBe(false);
    expect(deepEqualJson([1, 2], [1, 2, 3])).toBe(false);
  });

  it("compares objects key-order-insensitively", () => {
    expect(deepEqualJson({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(deepEqualJson({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqualJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqualJson({ a: { x: 0.1 + 0.2 } }, { a: { x: 0.3 } })).toBe(true);
  });
});

describe("normalizeStdout", () => {
  it("treats 5\\n and 5 as equal", () => {
    expect(normalizeStdout("5\n")).toBe(normalizeStdout("5"));
    expect(normalizeStdout("5 \n\n")).toBe(normalizeStdout("5"));
  });

  it("converts CRLF to LF", () => {
    expect(normalizeStdout("a\r\nb")).toBe(normalizeStdout("a\nb"));
  });

  it("strips trailing whitespace per line", () => {
    expect(normalizeStdout("a   \nb\t")).toBe("a\nb");
  });
});

describe("compareCase function mode", () => {
  it("ignores JSON whitespace", () => {
    expect(
      compareCase("[0,1]", raw({ got: "[0, 1]" }), "function", 0).passed,
    ).toBe(true);
  });

  it("passes equal scalars, fails type mismatch", () => {
    expect(compareCase("1", raw({ got: "1" }), "function", 0).passed).toBe(true);
    expect(compareCase('"x"', raw({ got: '"x"' }), "function", 0).passed).toBe(
      true,
    );
    expect(compareCase("true", raw({ got: "true" }), "function", 0).passed).toBe(
      true,
    );
    expect(compareCase("null", raw({ got: "null" }), "function", 0).passed).toBe(
      true,
    );
    expect(compareCase("1", raw({ got: '"1"' }), "function", 0).passed).toBe(
      false,
    );
  });

  it("fails when got is null", () => {
    expect(compareCase("1", raw({ got: null }), "function", 0).passed).toBe(
      false,
    );
  });

  it("fails when got is invalid JSON", () => {
    expect(compareCase("[1]", raw({ got: "[1," }), "function", 0).passed).toBe(
      false,
    );
  });

  it("fails when error present even if got matches", () => {
    const r = compareCase(
      "1",
      raw({ got: "1", error: "boom" }),
      "function",
      0,
    );
    expect(r.passed).toBe(false);
    expect(r.error).toBe("boom");
  });

  it("carries through fields and index", () => {
    const r = compareCase(
      "[0,1]",
      raw({ got: "[0, 1]", stdout: "log", timeMs: 7 }),
      "function",
      3,
    );
    expect(r).toMatchObject({
      index: 3,
      expected: "[0,1]",
      got: "[0, 1]",
      stdout: "log",
      error: null,
      timeMs: 7,
      passed: true,
    });
  });
});

describe("compareCase stdio mode", () => {
  it("passes 5\\n vs 5", () => {
    expect(compareCase("5", raw({ got: "5\n" }), "stdio", 0).passed).toBe(true);
  });

  it("passes CRLF vs LF", () => {
    expect(
      compareCase("a\nb", raw({ got: "a\r\nb" }), "stdio", 0).passed,
    ).toBe(true);
  });

  it("passes trailing spaces", () => {
    expect(compareCase("5", raw({ got: "5   " }), "stdio", 0).passed).toBe(true);
  });

  it("fails 5 vs 6", () => {
    expect(compareCase("6", raw({ got: "5" }), "stdio", 0).passed).toBe(false);
  });

  it("fails when error present", () => {
    expect(
      compareCase("5", raw({ got: "5", error: "boom" }), "stdio", 0).passed,
    ).toBe(false);
  });

  it("treats null got as empty string", () => {
    expect(compareCase("", raw({ got: null }), "stdio", 0).passed).toBe(true);
  });
});
