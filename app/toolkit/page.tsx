import Link from "next/link";
import { BookOpen, Dumbbell } from "lucide-react";
import {
  getPatternCoverage,
  patternsByKindAndTier,
  KINDS,
  TIERS,
  TIER_BLURB,
} from "@/lib/patterns";
import { PATTERNS } from "@/lib/toolkit";
import { Badge } from "@/components/chrome/badge";
import { FadeIn, staggerDelay } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ToolkitPage() {
  const coverage = await getPatternCoverage();
  const taughtCount = PATTERNS.filter((p) => coverage.taught.has(p.key)).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16 lowercase">
      <PageHeader
        eyebrow="the syllabus"
        title="toolkit"
        subtitle={`every structure and technique worth knowing, tiered so you know where to stop. ${taughtCount} of ${PATTERNS.length} written so far.`}
      />

      {KINDS.map((kind) => (
        <section key={kind.key} className="flex flex-col gap-10">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{kind.label}</h2>

          {TIERS.map((tier) => {
            const patterns = patternsByKindAndTier(kind.key, tier);
            if (patterns.length === 0) return null;

            return (
              <div key={tier} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tier}</Badge>
                    <span className="font-mono text-xs text-white/40">
                      {patterns.length} {patterns.length === 1 ? "pattern" : "patterns"}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">{TIER_BLURB[tier]}</p>
                </div>

                <ul className="flex flex-col">
                  {patterns.map((pattern, i) => {
                    const taught = coverage.taught.has(pattern.key);
                    const problems = coverage.problemCounts.get(pattern.key) ?? 0;

                    return (
                      <li key={pattern.key}>
                        <FadeIn delay={staggerDelay(i, 0.02)}>
                          <Link
                            href={`/patterns/${pattern.key}`}
                            className="group flex items-center justify-between gap-4 border-b border-white/5 py-2.5 transition-colors hover:bg-white/5"
                          >
                            <span className="truncate text-[15px] text-white/80 transition-colors group-hover:text-white">
                              {pattern.label}
                            </span>
                            <span className="flex shrink-0 items-center gap-3 font-mono text-xs text-white/35">
                              {taught ? (
                                <span
                                  className="flex items-center gap-1 text-white/60"
                                  title="article published"
                                >
                                  <BookOpen aria-hidden className="size-3" />
                                  article
                                </span>
                              ) : null}
                              {problems > 0 ? (
                                <span className="flex items-center gap-1" title="problems published">
                                  <Dumbbell aria-hidden className="size-3" />
                                  {problems}
                                </span>
                              ) : null}
                              {!taught && problems === 0 ? <span>not written</span> : null}
                            </span>
                          </Link>
                        </FadeIn>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
