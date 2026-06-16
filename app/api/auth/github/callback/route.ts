import { NextRequest, NextResponse } from "next/server";
import { verifyState, exchangeCodeForToken, fetchGitHubProfile } from "@/lib/github-oauth";
import { upsertGitHubUser } from "@/lib/users";
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/sessions";

const STATE_COOKIE = "leet_oauth_state";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const queryState = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/?auth_error=${reason}`, req.url));
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  if (!code || !verifyState(cookieState, queryState)) return fail("state");

  try {
    const token = await exchangeCodeForToken(code);
    const profile = await fetchGitHubProfile(token);
    const user = await upsertGitHubUser(profile);
    const sessionId = await createSession(user.id);

    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 }); // clear one-time state
    return res;
  } catch {
    return fail("oauth"); // never leak token/secret details
  }
}
