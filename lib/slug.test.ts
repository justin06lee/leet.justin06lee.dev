import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates, dropping trailing punctuation", () => {
    expect(slugify("Two Sum!")).toBe("two-sum");
  });

  it("has no leading/trailing/double hyphens and is lowercase", () => {
    const s = slugify("  C++  Tricks ");
    expect(s).toBe(s.toLowerCase());
    expect(s.startsWith("-")).toBe(false);
    expect(s.endsWith("-")).toBe(false);
    expect(s.includes("--")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns base when free", async () => {
    expect(await uniqueSlug("x", async () => false)).toBe("x");
  });

  it("appends -2 when base taken", async () => {
    expect(await uniqueSlug("x", async (s) => s === "x")).toBe("x-2");
  });
});
