import { Suspense } from "react";
import Link from "next/link";
import ProblemFilters from "@/components/ProblemFilters";
import { Card, CardBody } from "@/components/chrome/card";
import { Badge } from "@/components/chrome/badge";
import { FadeIn, staggerDelay } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        title="problems"
        subtitle="the drill bank — tagged by pattern, not by company. every problem names the idea it exercises."
      />

      <FadeIn delay={0.2} className="mt-8">
        <Suspense fallback={null}>
          <ProblemFilters />
        </Suspense>
      </FadeIn>

      <div className="mt-8">
        {problems.length === 0 ? (
          <Card className="border-dashed">
            <CardBody>no problems match these filters.</CardBody>
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {problems.map((problem, i) => {
              const pat = problem.pattern ? getPattern(problem.pattern) : undefined;
              return (
                <li key={problem.id}>
                  <FadeIn delay={staggerDelay(Math.min(i, 8), 0.06, 0.25)}>
                    <Link href={`/problems/${problem.slug}`} className="group block h-full">
                      <Card className="h-full gap-3 transition-colors group-hover:border-white/25">
                        <h2 className="text-base font-semibold leading-snug text-white/80 transition-colors group-hover:text-white">
                          {problem.title}
                        </h2>
                        <div className="mt-auto flex flex-wrap items-center gap-2">
                          {pat ? <Badge variant="ghost">{pat.label}</Badge> : null}
                          <Badge variant="outline">{problem.difficulty}</Badge>
                        </div>
                      </Card>
                    </Link>
                  </FadeIn>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
