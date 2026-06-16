import { describe, it, expect } from "vitest";
import { PATTERNS, getPattern } from "./toolkit";

describe("PATTERNS", () => {
  it("has unique keys", () => {
    const keys = PATTERNS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has valid kind and tier for every entry", () => {
    const kinds = new Set(["structure", "technique"]);
    const tiers = new Set(["core", "intermediate", "stretch"]);
    for (const p of PATTERNS) {
      expect(kinds.has(p.kind)).toBe(true);
      expect(tiers.has(p.tier)).toBe(true);
      expect(p.key.length).toBeGreaterThan(0);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});

describe("getPattern", () => {
  it("returns the entry for a known key", () => {
    expect(getPattern("two-pointers-opposite")).toEqual({
      key: "two-pointers-opposite",
      label: "two pointers — opposite ends",
      kind: "technique",
      tier: "core",
    });
  });

  it("returns undefined for an unknown key", () => {
    expect(getPattern("definitely-not-a-key")).toBeUndefined();
  });
});
