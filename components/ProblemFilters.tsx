"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Select from "@/components/chrome/select";
import { Button } from "@/components/chrome/button";
import { PATTERNS, type Tier } from "@/lib/toolkit";
import type { Difficulty } from "@/lib/problems";

const TIERS: Tier[] = ["core", "intermediate", "stretch"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const PATTERN_OPTIONS = [
  { value: "", label: "all patterns" },
  ...PATTERNS.map((p) => ({ value: p.key, label: p.label })),
];

const TIER_OPTIONS = [
  { value: "", label: "all tiers" },
  ...TIERS.map((t) => ({ value: t, label: t })),
];

const DIFFICULTY_OPTIONS = [
  { value: "", label: "all difficulties" },
  ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
];

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
      <Select
        ariaLabel="pattern"
        value={pattern}
        onChange={(value) => update("pattern", value)}
        options={PATTERN_OPTIONS}
      />
      <Select
        ariaLabel="tier"
        value={tier}
        onChange={(value) => update("tier", value)}
        options={TIER_OPTIONS}
      />
      <Select
        ariaLabel="difficulty"
        value={difficulty}
        onChange={(value) => update("difficulty", value)}
        options={DIFFICULTY_OPTIONS}
      />
      {hasFilters && (
        <Button variant="link" onClick={() => router.push(pathname)}>
          clear
        </Button>
      )}
    </div>
  );
}
