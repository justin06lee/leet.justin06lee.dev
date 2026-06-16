import { NextRequest, NextResponse } from "next/server";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { buildAuthorizeUrl, generateState } from "@/lib/github-oauth";

const STATE_COOKIE = "leet_oauth_state";

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(getClientIp(req)))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "OAuth not configured" }, { status: 500 });
  }
  const state = generateState();
  // Derive the callback from this request's origin so dev (localhost) and prod
  // each return to their own host. The callback route reconstructs the same URL.
  const redirectUri = new URL("/api/auth/github/callback", req.nextUrl.origin).toString();
  const res = NextResponse.redirect(buildAuthorizeUrl(clientId, state, redirectUri));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes to complete the round-trip
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
