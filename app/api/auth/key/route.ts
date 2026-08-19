import { NextRequest, NextResponse } from "next/server";
import { verifyAdminKey } from "@/lib/admin-key";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { getUserByLogin } from "@/lib/users";
import { createSession, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// ADMIN_KEY login: exchange the master key for an owner session — the same
// `leet_session` cookie GitHub OAuth sets, attached to the owner's user row.
export async function POST(req: NextRequest) {
  // Rate limit before touching the key so guesses burn attempts either way.
  if (!(await checkRateLimit(getClientIp(req)))) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  if (!process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "admin key login is not configured" }, { status: 503 });
  }

  let password: unknown;
  try {
    const body = await req.json();
    password = (body as { password?: unknown })?.password;
  } catch {
    password = undefined;
  }

  if (!verifyAdminKey(password)) {
    return NextResponse.json({ error: "that isn't it" }, { status: 401 });
  }

  // Sessions hang off a user row; the owner's is created by GitHub OAuth.
  const ownerLogin = process.env.OWNER_GITHUB_LOGIN;
  const owner = ownerLogin ? await getUserByLogin(ownerLogin) : null;
  if (!owner) {
    return NextResponse.json(
      { error: "owner has never signed in via GitHub" },
      { status: 503 },
    );
  }

  const sessionId = await createSession(owner.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

// Session probe: is this cookie still good, and is it the owner?
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, owner: user.tier === "owner" });
}
