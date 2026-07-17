"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CommandPalette, type PaletteItem } from "@/components/chrome/command-palette";
import { PATTERNS } from "@/lib/toolkit";

const PAGES: PaletteItem[] = [
  { label: "home", href: "/", group: "pages" },
  { label: "toolkit", href: "/toolkit", group: "pages", keywords: ["syllabus", "curriculum"] },
  { label: "problems", href: "/problems", group: "pages", keywords: ["drill", "practice"] },
  { label: "articles", href: "/articles", group: "pages", keywords: ["writing", "posts"] },
  { label: "dashboard", href: "/dashboard", group: "pages", keywords: ["progress"] },
  { label: "mastery", href: "/mastery", group: "pages", keywords: ["progress", "coverage"] },
  { label: "today's session", href: "/session", group: "pages", keywords: ["review", "srs", "due"] },
];

/**
 * Global cmd+k navigation. Every pattern in the syllabus is reachable by name —
 * there are far too many to scroll the toolkit for. Mounted once in the root
 * layout; the palette renders nothing until opened.
 */
export function Palette() {
  const router = useRouter();

  // PATTERNS is a module constant, so this list is built once per mount.
  const items = useMemo<PaletteItem[]>(
    () => [
      ...PAGES,
      ...PATTERNS.map((p) => ({
        id: p.key,
        label: p.label,
        href: `/patterns/${p.key}`,
        group: p.kind === "structure" ? "data structures" : "techniques",
        keywords: [p.tier, p.key],
      })),
    ],
    [],
  );

  return (
    <CommandPalette
      items={items}
      placeholder="search patterns and pages…"
      onSelect={(item) => {
        if (item.href) router.push(item.href);
      }}
    />
  );
}
