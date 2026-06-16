import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { getClientIp, checkRateLimit } from "./rate-limit";

function reqWith(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://leet.justin06lee.dev/api/auth/github", { headers });
}

describe("getClientIp", () => {
  it("prefers x-real-ip", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
  });
  it("falls back to the rightmost x-forwarded-for hop", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "9.9.9.9, 5.6.7.8" }))).toBe("5.6.7.8");
  });
  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(reqWith({}))).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  it("allows up to the cap then blocks", async () => {
    const ip = "203.0.113.7";
    let lastAllowed = true;
    for (let i = 0; i < 12; i++) lastAllowed = await checkRateLimit(ip);
    expect(lastAllowed).toBe(false); // exceeded 10/window
  });
});
