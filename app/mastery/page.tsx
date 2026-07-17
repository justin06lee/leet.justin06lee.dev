import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { getMastery, type PatternMastery } from "@/lib/mastery";
import { KINDS, TIERS } from "@/lib/patterns";
import { Badge } from "@/components/chrome/badge";
import { Card, CardBody } from "@/components/chrome/card";
import { FadeIn } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { Meter } from "@/components/Meter";

export const dynamic = "force-dynamic";

/**
 * Patterns worth attention: has problems to drill, and you haven't mastered
 * them all. Core tier first, then by how much is left — the "what do I do now"
 * answer the whole course is built around.
 */
function weakest(perPattern: PatternMastery[], limit = 6): PatternMastery[] {
  const tierRank: Record<string, number> = { core: 0, intermediate: 1, stretch: 2 };
  return perPattern
    .filter((p) => p.problemCount > 0 && p.mastered < p.problemCount)
    .sort((a, b) => {
      const byTier = tierRank[a.tier] - tierRank[b.tier];
      if (byTier !== 0) return byTier;
      const aLeft = a.problemCount - a.mastered;
      const bLeft = b.problemCount - b.mastered;
      return bLeft - aLeft;
    })
    .slice(0, limit);
}

export default async function Mastery() {
  const user = await requireUser(); // redirects to "/" if logged out
  const mastery = await getMastery(user.id);

  const totals = mastery.perPattern.reduce(
    (acc, p) => ({
      problemCount: acc.problemCount + p.problemCount,
      attempted: acc.attempted + p.attempted,
      mastered: acc.mastered + p.mastered,
    }),
    { problemCount: 0, attempted: 0, mastered: 0 },
  );

  const focus = weakest(mastery.perPattern);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        title="mastery"
        subtitle="your progress against the syllabus — and which patterns to pick up next."
      />

      <FadeIn delay={0.2} className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="mastered"
          value={totals.mastered}
          hint={`of ${totals.problemCount} published problems`}
        />
        <StatTile label="attempted" value={totals.attempted} hint="problems you've graded" />
        <StatTile label="day streak" value={mastery.streakDays} hint="consecutive days reviewed" />
      </FadeIn>

      <FadeIn delay={0.25} className="mt-12 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-white">work on these next</h2>
          <p className="text-sm text-white/50">
            unfinished patterns, core tier first. this is the list that matters.
          </p>
        </div>
        {focus.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {focus.map((p) => (
              <Link key={p.key} href={`/patterns/${p.key}`} className="group">
                <Card className="h-full gap-3 transition-colors group-hover:border-white/25">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[15px] text-white/80 transition-colors group-hover:text-white">
                      {p.label}
                    </span>
                    <Badge variant="ghost">{p.tier}</Badge>
                  </div>
                  <Meter value={p.mastered} max={p.problemCount} label={`${p.label} mastery`} />
                  <span className="font-mono text-xs text-white/40">
                    {p.mastered}/{p.problemCount} mastered
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardBody>
              nothing outstanding — every pattern with published problems is mastered. add more
              problems, or move up a tier.
            </CardBody>
          </Card>
        )}
      </FadeIn>

      {KINDS.map((kind, ki) => (
        <FadeIn key={kind.key} delay={0.3 + ki * 0.05} className="mt-12 flex flex-col gap-6">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{kind.label}</h2>

          {TIERS.map((tier) => {
            const rows = mastery.perPattern.filter((p) => p.kind === kind.key && p.tier === tier);
            if (rows.length === 0) return null;

            return (
              <div key={tier} className="flex flex-col gap-2">
                <div className="border-b border-white/10 pb-2">
                  <Badge variant="outline">{tier}</Badge>
                </div>
                <ul className="flex flex-col">
                  {rows.map((p) => {
                    const empty = p.problemCount === 0;
                    return (
                      <li key={p.key}>
                        <Link
                          href={`/patterns/${p.key}`}
                          className="group flex items-center gap-4 border-b border-white/5 py-2.5 transition-colors hover:bg-white/5"
                        >
                          <span
                            className={`flex-1 truncate text-sm transition-colors group-hover:text-white ${
                              empty ? "text-white/35" : "text-white/80"
                            }`}
                          >
                            {p.label}
                          </span>
                          {empty ? (
                            <span className="font-mono text-xs text-white/25">no problems</span>
                          ) : (
                            <>
                              <Meter
                                value={p.mastered}
                                max={p.problemCount}
                                label={`${p.label} mastery`}
                                className="hidden w-32 sm:block"
                              />
                              <span className="w-24 shrink-0 text-right font-mono text-xs text-white/40">
                                {p.mastered}/{p.problemCount}
                              </span>
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </FadeIn>
      ))}
    </div>
  );
}
