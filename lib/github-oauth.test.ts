import { describe, it, expect } from "vitest";
import { buildAuthorizeUrl, verifyState, generateState } from "./github-oauth";

describe("buildAuthorizeUrl", () => {
  it("includes client_id, scope, state, and redirect_uri", () => {
    const url = new URL(
      buildAuthorizeUrl("client123", "statexyz", "http://localhost:3000/api/auth/github/callback"),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client123");
    expect(url.searchParams.get("scope")).toBe("read:user");
    expect(url.searchParams.get("state")).toBe("statexyz");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/github/callback",
    );
  });
});

describe("verifyState", () => {
  it("is true only when both present and equal", () => {
    expect(verifyState("abc", "abc")).toBe(true);
    expect(verifyState("abc", "def")).toBe(false);
    expect(verifyState(undefined, "abc")).toBe(false);
    expect(verifyState("abc", null)).toBe(false);
    expect(verifyState("", "")).toBe(false); // empty is not a valid state
  });
});

describe("generateState", () => {
  it("produces a non-empty unique-ish string", () => {
    expect(generateState().length).toBeGreaterThan(10);
    expect(generateState()).not.toBe(generateState());
  });
});
