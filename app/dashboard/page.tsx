import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { requireUser } from "@/lib/auth-server";
import { getMastery } from "@/lib/mastery";
import { buildDailySession } from "@/lib/session";
import { getReviewActivity, TIERS } from "@/lib/patterns";
import { dayToISO, epochDay } from "@/lib/day";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";
import { Card, CardBody } from "@/components/chrome/card";
import { FadeIn } from "@/components/chrome/fade-in";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { Meter } from "@/components/Meter";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser(); // redirects to "/" if logged out

  const today = dayToISO(epochDay());
  const year = Number(today.slice(0, 4));

  const [mastery, { items }, activity] = await Promise.all([
    getMastery(user.id),
    buildDailySession(user.id),
    getReviewActivity(user.id, year),
  ]);

  const hasSession = items.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        eyebrow={`signed in as ${user.githubLogin} · ${user.tier}`}
        title="dashboard"
        subtitle="what's due, what's stuck, and how much of the syllabus you've actually got."
        actions={
          hasSession ? (
            <Button variant="solid" iconRight={ArrowRight} href="/session">
              start session ({items.length})
            </Button>
          ) : (
            <Button variant="outline" href="/problems">
              browse problems
            </Button>
          )
        }
      />

      <FadeIn delay={0.2} className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="due today" value={mastery.dueToday} hint="reviews the scheduler surfaced" />
        <StatTile label="day streak" value={mastery.streakDays} hint="consecutive days reviewed" />
        <StatTile label="reviews" value={mastery.totalReviews} hint="all time" />
      </FadeIn>

      {!hasSession ? (
        <FadeIn delay={0.25} className="mt-4">
          <Card className="border-dashed">
            <CardBody>
              nothing due today. that&apos;s the system working — pick up a new pattern from the{" "}
              <Link href="/toolkit" className="text-white underline-offset-4 hover:underline">
                toolkit
              </Link>{" "}
              instead of grinding reviews.
            </CardBody>
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.3} className="mt-12 flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">coverage by tier</h2>
          <Button variant="link" size="sm" iconRight={ArrowRight} href="/mastery">
            full breakdown
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const t = mastery.tiers[tier];
            return (
              <Card key={tier} className="gap-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{tier}</Badge>
                  <span className="font-mono text-xs text-white/40">
                    {t.mastered}/{t.problemCount || 0}
                  </span>
                </div>
                <Meter value={t.mastered} max={t.problemCount} label={`${tier} mastery`} />
                <span className="text-sm text-white/50">
                  {t.attempted} attempted across {t.patterns} patterns
                </span>
              </Card>
            );
          })}
        </div>
      </FadeIn>

      <FadeIn delay={0.35} className="mt-12 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-white">activity</h2>
          <p className="text-sm text-white/50">reviews per day, {year}.</p>
        </div>
        <ActivityHeatmap values={activity} year={year} today={today} />
      </FadeIn>
    </div>
  );
}
