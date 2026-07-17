import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-server";
import { Navbar as ChromeNavbar, type NavLink } from "@/components/chrome/navbar";
import { Button } from "@/components/chrome/button";

export default async function Navbar() {
  const user = await getCurrentUser();

  const leftLinks: NavLink[] = [
    { label: "toolkit", href: "/toolkit" },
    { label: "problems", href: "/problems" },
    { label: "articles", href: "/articles" },
  ];

  const links: NavLink[] = [];
  if (user) {
    links.push({ label: "session", href: "/session" });
    links.push({ label: "mastery", href: "/mastery" });
    links.push({ label: "dashboard", href: "/dashboard" });
  }
  if (user?.tier === "owner") {
    links.push({ label: "admin", href: "/admin" });
  }

  const brand = (
    <Link href="/" className="font-mono tracking-tight text-white">
      leet
    </Link>
  );

  const actions = user ? (
    <>
      <span className="whitespace-nowrap text-sm text-white/50">{user.githubLogin}</span>
      <form action="/api/auth/logout" method="post">
        <Button variant="ghost" size="sm" type="submit">
          log out
        </Button>
      </form>
    </>
  ) : (
    <Button variant="outline" size="sm" href="/api/auth/github">
      sign in
    </Button>
  );

  return <ChromeNavbar brand={brand} leftLinks={leftLinks} links={links} actions={actions} />;
}
