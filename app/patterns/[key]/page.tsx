import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getPatternContent, patternNeighbors, TIER_BLURB } from "@/lib/patterns";
import { getMastery } from "@/lib/mastery";
import { extractHeadings } from "@/lib/markdown";
import { Prose } from "@/components/chrome/prose";
import { Toc } from "@/components/chrome/toc";
import { Badge } from "@/components/chrome/badge";
import { Button } from "@/components/chrome/button";
import { Card, CardHeader, CardTitle, CardMeta, CardBody } from "@/components/chrome/card";
import { Breadcrumb } from "@/components/chrome/breadcrumb";
import { FadeIn, staggerDelay } from "@/components/chrome/fade-in";
import { Meter } from "@/components/Meter";

export const dynamic = "force-dynamic";

export default async function PatternPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const content = await getPatternContent(key);
  if (!content) notFound();

  const { pattern, article, problems } = content;
  const { prev, next } = patternNeighbors(key);

  const user = await getCurrentUser();
  const mastery = user ? await getMastery(user.id) : null;
  const stat = mastery?.perPattern.find((p) => p.key === key) ?? null;

  const headings = article ? extractHeadings(article.body) : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 lowercase">
      <FadeIn>
        <Breadcrumb
          linkComponent={Link}
          items={[
            { label: "toolkit", href: "/toolkit" },
            { label: pattern.kind === "structure" ? "data structures" : "techniques", href: "/toolkit" },
            { label: pattern.label },
          ]}
        />
      </FadeIn>

      <FadeIn delay={0.05} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="solid">{pattern.tier}</Badge>
          <Badge variant="outline">{pattern.kind}</Badge>
        </div>
        <h1 className="font-mono text-3xl tracking-tight text-white">{pattern.label}</h1>
        <p className="max-w-2xl text-white/60">{TIER_BLURB[pattern.tier]}</p>
      </FadeIn>

      {stat ? (
        <FadeIn delay={0.1}>
          <Card>
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                your mastery
              </span>
              <span className="font-mono text-sm text-white/60">
                {stat.mastered}/{stat.problemCount || 0} mastered · {stat.attempted} attempted
              </span>
            </div>
            <Meter
              value={stat.mastered}
              max={stat.problemCount}
              label={`${pattern.label} mastery`}
            />
          </Card>
        </FadeIn>
      ) : null}

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-12">
        <main className="flex min-w-0 flex-1 flex-col gap-12">
          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              the pattern
            </h2>
            {article ? (
              <Prose linkComponent={Link}>{article.body}</Prose>
            ) : (
              <Card className="border-dashed">
                <CardBody>
                  no article yet for this pattern. the syllabus lists it, but the write-up
                  isn&apos;t published — check back, or start with the problems below.
                </CardBody>
              </Card>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
              drill it — {problems.length} {problems.length === 1 ? "problem" : "problems"}
            </h2>
            {problems.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {problems.map((problem, i) => (
                  <li key={problem.id}>
                    <FadeIn delay={staggerDelay(i, 0.05)}>
                      <Card>
                        <CardHeader>
                          <CardTitle href={`/problems/${problem.slug}`}>{problem.title}</CardTitle>
                          <CardMeta>
                            <Badge variant="ghost">{problem.difficulty}</Badge>
                          </CardMeta>
                        </CardHeader>
                      </Card>
                    </FadeIn>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="border-dashed">
                <CardBody>no problems published for this pattern yet.</CardBody>
              </Card>
            )}
          </section>

          <nav className="flex items-center justify-between gap-4 border-t border-white/10 pt-6">
            {prev ? (
              <Button variant="ghost" icon={ArrowLeft} href={`/patterns/${prev.key}`}>
                {prev.label}
              </Button>
            ) : (
              <span />
            )}
            {next ? (
              <Button variant="ghost" iconRight={ArrowRight} href={`/patterns/${next.key}`}>
                {next.label}
              </Button>
            ) : (
              <span />
            )}
          </nav>
        </main>

        {headings.length > 1 ? (
          <aside className="hidden w-56 shrink-0 lg:block">
            <Toc headings={headings} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
