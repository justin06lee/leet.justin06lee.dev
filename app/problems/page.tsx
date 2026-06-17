import { Suspense } from "react";
import ProblemFilters from "@/components/ProblemFilters";
import { Card, CardHeader, CardTitle, CardMeta } from "@/components/chrome/card";
import { Badge } from "@/components/chrome/badge";
import { listProblems, type Difficulty } from "@/lib/problems";
import { getPattern, type Tier } from "@/lib/toolkit";

export const dynamic = "force-dynamic";

const TIERS: Tier[] = ["core", "intermediate", "stretch"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;

  const pattern = first(sp.pattern);
  const tierRaw = first(sp.tier);
  const difficultyRaw = first(sp.difficulty);

  const tier = tierRaw && TIERS.includes(tierRaw as Tier) ? (tierRaw as Tier) : undefined;
  const difficulty =
    difficultyRaw && DIFFICULTIES.includes(difficultyRaw as Difficulty)
      ? (difficultyRaw as Difficulty)
      : undefined;

  const problems = await listProblems({
    ...(pattern ? { pattern } : {}),
    ...(tier ? { tier } : {}),
    ...(difficulty ? { difficulty } : {}),
  });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="font-mono text-3xl tracking-tight">problems</h1>
      <Suspense fallback={null}>
        <ProblemFilters />
      </Suspense>
      {problems.length === 0 ? (
        <p className="text-muted">no problems match these filters.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {problems.map((problem) => {
            const pat = problem.pattern ? getPattern(problem.pattern) : undefined;
            return (
              <li key={problem.id}>
                <Card>
                  <CardHeader>
                    <CardTitle href={`/problems/${problem.slug}`}>
                      {problem.title}
                    </CardTitle>
                    <CardMeta className="flex flex-wrap items-center justify-end gap-2">
                      {pat && <Badge>{pat.label}</Badge>}
                      <Badge>{problem.difficulty}</Badge>
                      <Badge>{problem.judgingMode}</Badge>
                    </CardMeta>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
