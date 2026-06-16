import { describe, it, expect } from "vitest";
import { resolveTier, canUseServerJudge, canSeeHiddenTests } from "./tiers";

describe("resolveTier", () => {
  it("returns owner when login matches OWNER_GITHUB_LOGIN (case-insensitive)", () => {
    expect(resolveTier("JustIn06Lee", "free", "justin06lee")).toBe("owner");
  });
  it("returns the stored tier for non-owners", () => {
    expect(resolveTier("someone", "free", "justin06lee")).toBe("free");
    expect(resolveTier("someone", "paid", "justin06lee")).toBe("paid");
  });
  it("never resolves owner when ownerLogin is undefined", () => {
    expect(resolveTier("justin06lee", "free", undefined)).toBe("free");
  });
});

describe("tier capability gates", () => {
  it("grants judge + hidden tests to paid and owner only", () => {
    expect(canUseServerJudge("owner")).toBe(true);
    expect(canUseServerJudge("paid")).toBe(true);
    expect(canUseServerJudge("free")).toBe(false);
    expect(canSeeHiddenTests("owner")).toBe(true);
    expect(canSeeHiddenTests("paid")).toBe(true);
    expect(canSeeHiddenTests("free")).toBe(false);
  });
});
