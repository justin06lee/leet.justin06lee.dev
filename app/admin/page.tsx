import { ArrowRight } from "@/components/icons";
import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import { listProblems } from "@/lib/problems";
import { getPatternCoverage } from "@/lib/patterns";
import { PATTERNS } from "@/lib/toolkit";
import { Card, CardHeader, CardTitle, CardBody, CardActions } from "@/components/chrome/card";
import { Button } from "@/components/chrome/button";
import { FadeIn } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireOwner();

  const [problems, articles, coverage] = await Promise.all([
    listProblems({ includeUnpublished: true }),
    listArticles({ includeUnpublished: true }),
    getPatternCoverage(),
  ]);

  const problemsPublished = problems.filter((p) => p.published).length;
  const articlesPublished = articles.filter((a) => a.published).length;
  const untaught = PATTERNS.filter((p) => !coverage.taught.has(p.key));
  const untaughtCore = untaught.filter((p) => p.tier === "core");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader eyebrow="admin" title="content" subtitle="what's written, and what's missing." />

      <FadeIn delay={0.2} className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="patterns taught"
          value={PATTERNS.length - untaught.length}
          hint={`of ${PATTERNS.length} in the syllabus`}
        />
        <StatTile
          label="core gaps"
          value={untaughtCore.length}
          hint="core patterns with no article"
        />
        <StatTile
          label="problems live"
          value={problemsPublished}
          hint={`${problems.length} total`}
        />
      </FadeIn>

      <FadeIn delay={0.25} className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>problems</CardTitle>
          </CardHeader>
          <CardBody>
            {problemsPublished} published · {problems.length - problemsPublished} draft
          </CardBody>
          <CardActions>
            <Button variant="outline" size="sm" iconRight={ArrowRight} href="/admin/problems">
              manage problems
            </Button>
          </CardActions>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>articles</CardTitle>
          </CardHeader>
          <CardBody>
            {articlesPublished} published · {articles.length - articlesPublished} draft
          </CardBody>
          <CardActions>
            <Button variant="outline" size="sm" iconRight={ArrowRight} href="/admin/articles">
              manage articles
            </Button>
          </CardActions>
        </Card>
      </FadeIn>

      {untaughtCore.length > 0 ? (
        <FadeIn delay={0.3} className="mt-12 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">write these next</h2>
            <p className="text-sm text-white/50">
              core patterns with no published article — the gaps that matter most.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {untaughtCore.map((p) => (
              <li key={p.key}>
                <Button variant="dashed" size="sm" href={`/admin/articles/new?pattern=${p.key}`}>
                  {p.label}
                </Button>
              </li>
            ))}
          </ul>
        </FadeIn>
      ) : null}
    </div>
  );
}
