"use client";

import { useRef } from "react";
import Link from "next/link";
import { Navbar as ChromeNavbar, type NavLink } from "@/components/chrome/navbar";

export type NavbarUser = {
  isOwner: boolean;
};

/**
 * The site nav.
 *
 * Deliberately short. The course surfaces (toolkit / problems / articles) sit
 * beside the brand; everything personal collapses to `dashboard`, which is the
 * hub that links on to the daily session and mastery — they don't each need a
 * top-level slot. The signed-in login is shown on the dashboard, not here.
 *
 * This is a client component because chrome's NavLink takes an `onClick`, and a
 * function prop cannot cross the server/client boundary — the log out item needs
 * one. It also has to be an item rather than an `actions` node: chrome renders
 * `actions` only at md and up, so a log out button placed there would be
 * unreachable on mobile, whereas `links` are listed in the mobile panel.
 */
export function NavbarClient({ user }: { user: NavbarUser | null }) {
  const logoutRef = useRef<HTMLFormElement>(null);

  const leftLinks: NavLink[] = [
    { label: "toolkit", href: "/toolkit" },
    { label: "problems", href: "/problems" },
    { label: "articles", href: "/articles" },
  ];

  const links: NavLink[] = user
    ? [
        { label: "dashboard", href: "/dashboard" },
        ...(user.isOwner ? [{ label: "admin", href: "/admin" } as NavLink] : []),
        // Submits the real form so the route's redirect + cookie clearing apply.
        { label: "log out", id: "logout", onClick: () => logoutRef.current?.requestSubmit() },
      ]
    : [{ label: "sign in", href: "/api/auth/github" }];

  const brand = (
    <Link href="/" className="font-mono tracking-tight text-white">
      leet
    </Link>
  );

  return (
    <>
      <ChromeNavbar brand={brand} leftLinks={leftLinks} links={links} />
      {user ? (
        <form ref={logoutRef} action="/api/auth/logout" method="post" className="hidden" />
      ) : null}
    </>
  );
}
