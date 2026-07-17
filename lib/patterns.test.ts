import { describe, it, expect } from "vitest";
import { patternNeighbors, patternsByKindAndTier, TIER_BLURB, TIERS, KINDS } from "./patterns";
import { PATTERNS } from "./toolkit";

describe("patternsByKindAndTier", () => {
  it("returns only patterns matching both kind and tier, in syllabus order", () => {
    const core = patternsByKindAndTier("structure", "core");
    expect(core.length).toBeGreaterThan(0);
    expect(core.every((p) => p.kind === "structure" && p.tier === "core")).toBe(true);
    expect(core[0].key).toBe("array");
  });

  it("partitions the syllabus exactly — every pattern lands in one bucket", () => {
    const total = KINDS.flatMap((k) => TIERS.map((t) => patternsByKindAndTier(k.key, t).length)).reduce(
      (a, b) => a + b,
      0,
    );
    expect(total).toBe(PATTERNS.length);
  });
});

describe("patternNeighbors", () => {
  it("walks the syllabus in order", () => {
    const i = PATTERNS.findIndex((p) => p.key === "string");
    const { prev, next } = patternNeighbors("string");
    expect(prev?.key).toBe(PATTERNS[i - 1].key);
    expect(next?.key).toBe(PATTERNS[i + 1].key);
  });

  it("has no prev at the first pattern and no next at the last", () => {
    expect(patternNeighbors(PATTERNS[0].key).prev).toBeNull();
    expect(patternNeighbors(PATTERNS[PATTERNS.length - 1].key).next).toBeNull();
  });

  it("returns both null for an unknown key rather than throwing", () => {
    expect(patternNeighbors("not-a-pattern")).toEqual({ prev: null, next: null });
  });
});

describe("TIER_BLURB", () => {
  it("covers every tier", () => {
    for (const tier of TIERS) {
      expect(TIER_BLURB[tier]).toBeTruthy();
    }
  });
});
