import { describe, it, expect } from "vitest";
import { initDb } from "./db";
import { upsertGitHubUser } from "./users";
import { createSession, getSessionUser, destroySession, isExpired, SESSION_COOKIE_NAME } from "./sessions";

const profile = { id: 7, login: "sess", name: null, avatar_url: null, email: null };

describe("isExpired", () => {
  it("is true once now passes expires_at", () => {
    expect(isExpired("2020-01-01T00:00:00.000Z", Date.parse("2020-01-02T00:00:00.000Z"))).toBe(true);
  });
  it("is false before expiry", () => {
    expect(isExpired("2099-01-01T00:00:00.000Z", Date.parse("2020-01-01T00:00:00.000Z"))).toBe(false);
  });
});

describe("session store", () => {
  it("creates a session resolvable back to its user", async () => {
    await initDb();
    const user = await upsertGitHubUser(profile);
    const token = await createSession(user.id);
    expect(typeof token).toBe("string");
    const resolved = await getSessionUser(token);
    expect(resolved?.id).toBe(user.id);
  });

  it("returns null for an unknown token", async () => {
    await initDb();
    expect(await getSessionUser("bogus")).toBeNull();
  });

  it("destroys a session", async () => {
    await initDb();
    const user = await upsertGitHubUser({ ...profile, id: 8, login: "sess8" });
    const token = await createSession(user.id);
    await destroySession(token);
    expect(await getSessionUser(token)).toBeNull();
  });

  it("exports a stable cookie name", () => {
    expect(SESSION_COOKIE_NAME).toBe("leet_session");
  });
});
