import { randomUUID } from "crypto";
import type { GitHubProfile } from "./users";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const SCOPE = "read:user";

export function generateState(): string {
  return randomUUID();
}

export function buildAuthorizeUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({ client_id: clientId, scope: SCOPE, state });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export function verifyState(
  cookieState: string | undefined,
  queryState: string | null,
): boolean {
  return Boolean(cookieState) && Boolean(queryState) && cookieState === queryState;
}

// Exchange the OAuth code for an access token. Throws on failure.
export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(`token exchange error: ${data.error ?? "no token"}`);
  return data.access_token;
}

// Fetch the authenticated user's profile. Throws on failure.
export async function fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
  const res = await fetch(USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "leet.justin06lee.dev",
    },
  });
  if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
  const u = (await res.json()) as {
    id: number; login: string; name: string | null;
    avatar_url: string | null; email: string | null;
  };
  return {
    id: u.id, login: u.login, name: u.name ?? null,
    avatar_url: u.avatar_url ?? null, email: u.email ?? null,
  };
}
