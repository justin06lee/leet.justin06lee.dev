import { describe, it, expect } from "vitest";
import { initDb, db } from "./db";
import { upsertGitHubUser, getUserById, getUserByLogin } from "./users";

const profile = {
  id: 4242,
  login: "octocat",
  name: "The Octocat",
  avatar_url: "https://example.com/a.png",
  email: "octo@example.com",
};

describe("upsertGitHubUser", () => {
  it("inserts a new user with default tier 'free' and returns it", async () => {
    await initDb();
    const user = await upsertGitHubUser(profile);
    expect(user.githubId).toBe(4242);
    expect(user.githubLogin).toBe("octocat");
    expect(user.tier).toBe("free");
    expect(typeof user.id).toBe("string");
  });

  it("updates profile fields on repeat login without creating a second row or resetting tier", async () => {
    await initDb();
    const first = await upsertGitHubUser(profile);
    // Simulate a manual paid grant.
    await db.execute({ sql: "UPDATE users SET tier='paid' WHERE id=?", args: [first.id] });

    const second = await upsertGitHubUser({ ...profile, name: "Mona", login: "octocat" });
    expect(second.id).toBe(first.id); // same row
    expect(second.name).toBe("Mona"); // profile refreshed
    expect(second.tier).toBe("paid"); // manual grant preserved

    const count = await db.execute("SELECT COUNT(*) AS n FROM users");
    expect(Number(count.rows[0].n)).toBe(1);
  });
});

describe("getUserById", () => {
  it("returns null for an unknown id", async () => {
    await initDb();
    expect(await getUserById("nope")).toBeNull();
  });
});

describe("getUserByLogin", () => {
  it("finds a user case-insensitively, matching resolveTier's comparison", async () => {
    await initDb();
    const user = await upsertGitHubUser(profile);
    expect((await getUserByLogin("OctoCat"))?.id).toBe(user.id);
  });
  it("returns null for an unknown login", async () => {
    await initDb();
    expect(await getUserByLogin("ghost")).toBeNull();
  });
});
