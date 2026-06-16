import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";

export default async function Navbar() {
  const user = await getCurrentUser();
  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4 text-sm lowercase">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-mono tracking-tight text-foreground">
          leet
        </Link>
        <Link href="/problems" className="text-muted hover:text-foreground">
          problems
        </Link>
        <Link href="/articles" className="text-muted hover:text-foreground">
          articles
        </Link>
        <Link href="/toolkit" className="text-muted hover:text-foreground">
          toolkit
        </Link>
        {user?.tier === "owner" && (
          <Link href="/admin" className="text-muted hover:text-foreground">
            admin
          </Link>
        )}
      </div>
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
