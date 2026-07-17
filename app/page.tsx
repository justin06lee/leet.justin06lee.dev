import { ArrowRight } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth-server";
import { getPatternCoverage } from "@/lib/patterns";
import { PATTERNS } from "@/lib/toolkit";
import { TIERS, TIER_BLURB } from "@/lib/patterns";
import { Button } from "@/components/chrome/button";
import { Chrome } from "@/components/chrome/chrome";
import { Donut } from "@/components/chrome/donut";
import { FadeIn, staggerDelay } from "@/components/chrome/fade-in";
import { Card } from "@/components/chrome/card";
import { Badge } from "@/components/chrome/badge";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "read the pattern",
    body: "each structure and technique gets an article that teaches the idea and the trigger — what makes a problem this pattern.",
  },
  {
    n: "02",
    title: "drill it",
    body: "problems are tagged by pattern, not by company. you run them in the browser against real tests, python or javascript.",
  },
  {
    n: "03",
    title: "the weak ones come back",
    body: "you grade yourself after each attempt. spaced repetition resurfaces exactly the patterns you're shaky on, and leaves the solid ones alone.",
  },
];

export default async function Home() {
  const [user, coverage] = await Promise.all([getCurrentUser(), getPatternCoverage()]);

  const tierCounts = TIERS.map((tier) => ({
    tier,
    total: PATTERNS.filter((p) => p.tier === tier).length,
    taught: PATTERNS.filter((p) => p.tier === tier && coverage.taught.has(p.key)).length,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-24 px-6 py-20 lowercase">
      <section className="flex flex-col items-start gap-8">
        <FadeIn>
          <Chrome as="div" className="font-mono">
            <Donut width={44} height={18} isolate={false} />
          </Chrome>
        </FadeIn>

        <FadeIn delay={0.1} className="flex flex-col gap-5">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            stop memorizing questions.
            <br />
            learn the patterns.
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-white/70">
            there are only so many ideas in this game. {PATTERNS.length} of them, tiered — and most
            people grind hundreds of problems without ever naming one. this is the syllabus
            instead: articles teach each pattern, problems drill it, and the ones you&apos;re weak
            at come back on a schedule.
          </p>
        </FadeIn>

        <FadeIn delay={0.2} className="flex flex-wrap items-center gap-3">
          {user ? (
            <Button variant="solid" iconRight={ArrowRight} href="/dashboard">
              go to your dashboard
            </Button>
          ) : (
            <Button variant="solid" iconRight={ArrowRight} href="/api/auth/github">
              sign in with github
            </Button>
          )}
          <Button variant="outline" href="/toolkit">
            see the syllabus
          </Button>
        </FadeIn>
      </section>

      <section className="flex flex-col gap-6">
        <FadeIn className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            the differentiator
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-white">know where to stop.</h2>
          <p className="max-w-2xl text-white/60">
            every pattern sits in a tier. the tier tells you how well you need to know it — and
            when to walk away. past stretch is competitive-programming territory, and you can
            safely ignore it.
          </p>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-3">
          {tierCounts.map(({ tier, total, taught }, i) => (
            <FadeIn key={tier} delay={staggerDelay(i, 0.08, 0.1)}>
              <Card className="h-full">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{tier}</Badge>
                  <span className="font-mono text-xs text-white/40">
                    {taught}/{total} taught
                  </span>
                </div>
                <p className="text-sm leading-6 text-white/60">{TIER_BLURB[tier]}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <FadeIn>
          <h2 className="text-2xl font-semibold tracking-tight text-white">how it works</h2>
        </FadeIn>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <FadeIn key={step.n} delay={staggerDelay(i, 0.08, 0.1)}>
              <Card className="h-full">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {step.n}
                </span>
                <h3 className="text-lg font-semibold leading-tight text-white">{step.title}</h3>
                <p className="text-sm leading-6 text-white/60">{step.body}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>
    </div>
  );
}
