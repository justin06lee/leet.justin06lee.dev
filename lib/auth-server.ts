import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE_NAME } from "./sessions";
import { resolveTier, type Tier } from "./tiers";
import type { User } from "./users";

// User with the effective tier (owner derived from OWNER_GITHUB_LOGIN).
export interface CurrentUser extends Omit<User, "tier"> {
  tier: Tier;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user) return null;
  return {
    ...user,
    tier: resolveTier(user.githubLogin, user.tier, process.env.OWNER_GITHUB_LOGIN),
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requireOwner(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.tier !== "owner") redirect("/");
  return user;
}
