import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export default async function Navbar() {
  const user = await getCurrentUser();
  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4 text-sm lowercase">
      <Link href="/" className="font-mono tracking-tight text-foreground">
        leet
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-muted">
              {user.githubLogin} · {user.tier}
            </span>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="text-muted hover:text-foreground">
                log out
              </button>
            </form>
          </>
        ) : (
          <Link href="/api/auth/github" className="text-foreground hover:text-muted">
            sign in with github
          </Link>
        )}
      </div>
    </nav>
  );
}
