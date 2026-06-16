// Stored tiers are only "free" | "paid". "owner" is derived at read time from
// OWNER_GITHUB_LOGIN and is never persisted, so it survives DB resets and
// cannot be self-assigned by editing a row.
export type Tier = "owner" | "free" | "paid";

export function resolveTier(
  githubLogin: string,
  storedTier: Tier,
  ownerLogin: string | undefined,
): Tier {
  if (ownerLogin && githubLogin.toLowerCase() === ownerLogin.toLowerCase()) {
    return "owner";
  }
  return storedTier;
}

export function canUseServerJudge(tier: Tier): boolean {
  return tier === "paid" || tier === "owner";
}

export function canSeeHiddenTests(tier: Tier): boolean {
  return tier === "paid" || tier === "owner";
}
