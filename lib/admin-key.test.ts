import { describe, it, expect, afterEach } from "vitest";
import { secretEquals, verifyAdminKey } from "./admin-key";

describe("secretEquals", () => {
  it("matches identical secrets", () => {
    expect(secretEquals("hunter2", "hunter2")).toBe(true);
  });
  it("rejects different secrets, including different lengths", () => {
    expect(secretEquals("hunter2", "hunter3")).toBe(false);
    expect(secretEquals("hunter2", "hunter22")).toBe(false);
    expect(secretEquals("", "hunter2")).toBe(false);
  });
  it("rejects when the stored secret is unset or empty", () => {
    expect(secretEquals("hunter2", undefined)).toBe(false);
    expect(secretEquals("hunter2", "")).toBe(false);
  });
});

describe("verifyAdminKey", () => {
  const original = process.env.ADMIN_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = original;
  });

  it("matches only the configured key", () => {
    process.env.ADMIN_KEY = "sesame";
    expect(verifyAdminKey("sesame")).toBe(true);
    expect(verifyAdminKey("sesamee")).toBe(false);
  });
  it("never matches when ADMIN_KEY is unset", () => {
    delete process.env.ADMIN_KEY;
    expect(verifyAdminKey("sesame")).toBe(false);
    expect(verifyAdminKey("")).toBe(false);
  });
  it("rejects non-string input", () => {
    process.env.ADMIN_KEY = "sesame";
    expect(verifyAdminKey(undefined)).toBe(false);
    expect(verifyAdminKey(42)).toBe(false);
  });
});
