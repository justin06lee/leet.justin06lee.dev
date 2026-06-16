"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PATTERNS, type Tier } from "@/lib/toolkit";
import type { Difficulty } from "@/lib/problems";

const TIERS: Tier[] = ["core", "intermediate", "stretch"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const SELECT_CLASS =
  "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground lowercase";

export default function ProblemFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const pattern = searchParams.get("pattern") ?? "";
  const tier = searchParams.get("tier") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const hasFilters = Boolean(pattern || tier || difficulty);

  return (
    <div className="flex flex-wrap items-center gap-2 lowercase">
      <select
        aria-label="pattern"
        className={SELECT_CLASS}
        value={pattern}
        onChange={(e) => update("pattern", e.target.value)}
      >
        <option value="">all patterns</option>
        {PATTERNS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      <select
        aria-label="tier"
        className={SELECT_CLASS}
        value={tier}
        onChange={(e) => update("tier", e.target.value)}
      >
        <option value="">all tiers</option>
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <select
        aria-label="difficulty"
        className={SELECT_CLASS}
        value={difficulty}
        onChange={(e) => update("difficulty", e.target.value)}
      >
        <option value="">all difficulties</option>
        {DIFFICULTIES.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      {hasFilters && (
        <Link href={pathname} className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
          clear
        </Link>
      )}
    </div>
  );
}
