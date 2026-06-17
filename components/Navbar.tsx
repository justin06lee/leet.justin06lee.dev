import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import { Navbar as ChromeNavbar, type NavLink } from "@/components/chrome/navbar";
import { Button } from "@/components/chrome/button";

export default async function Navbar() {
  const user = await getCurrentUser();

  const links: NavLink[] = [
    { label: "problems", href: "/problems" },
    { label: "articles", href: "/articles" },
    { label: "toolkit", href: "/toolkit" },
  ];
  if (user) {
    links.push({ label: "dashboard", href: "/dashboard" });
    links.push({ label: "mastery", href: "/mastery" });
  }
  if (user?.tier === "owner") {
    links.push({ label: "admin", href: "/admin" });
  }

  const brand = (
    <Link href="/" className="font-mono lowercase tracking-tight text-white">
      leet
    </Link>
  );

  const actions = user ? (
    <>
      <span className="text-sm text-white/60 lowercase">
        {user.githubLogin} · {user.tier}
      </span>
      <form action="/api/auth/logout" method="post">
        <Button variant="ghost" size="sm" type="submit">
          log out
        </Button>
      </form>
    </>
  ) : (
    <Button variant="outline" size="sm" href="/api/auth/github">
      sign in with github
    </Button>
  );

  return <ChromeNavbar brand={brand} links={links} actions={actions} />;
}
