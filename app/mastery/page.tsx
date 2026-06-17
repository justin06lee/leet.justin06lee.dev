import { requireUser } from "@/lib/auth-server";
import { getMastery, type PatternMastery } from "@/lib/mastery";
import type { Tier, PatternKind } from "@/lib/toolkit";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";
import { Card } from "@/components/chrome/card";

export const dynamic = "force-dynamic";

const TIERS: Tier[] = ["core", "intermediate", "stretch"];
const KINDS: PatternKind[] = ["structure", "technique"];

const KIND_LABEL: Record<PatternKind, string> = {
  structure: "data structures",
  technique: "techniques & patterns",
};

function pct(mastered: number, problemCount: number): number {
  return problemCount > 0 ? Math.round((mastered / problemCount) * 100) : 0;
}

export default async function Mastery() {
  const user = await requireUser(); // redirects to "/" if logged out

  const mastery = await getMastery(user.id);

  const totals = mastery.perPattern.reduce(
    (acc, p) => {
      acc.problemCount += p.problemCount;
      acc.attempted += p.attempted;
      acc.mastered += p.mastered;
      return acc;
    },
    { problemCount: 0, attempted: 0, mastered: 0 },
  );

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-24 lowercase">
      <header className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-mono text-lg text-foreground">mastery</h1>
          <Button variant="link" size="sm" href="/dashboard" className="px-0">
            back to dashboard
          </Button>
        </div>
        <p className="text-sm text-muted">
          your full syllabus progress against the toolkit.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Card className="gap-0 p-4">
            <div className="font-mono text-2xl text-foreground">{mastery.totalReviews}</div>
            <div className="text-sm text-muted">reviews</div>
          </Card>
          <Card className="gap-0 p-4">
            <div className="font-mono text-2xl text-foreground">{mastery.streakDays}</div>
            <div className="text-sm text-muted">day streak</div>
          </Card>
          <Card className="gap-0 p-4">
            <div className="font-mono text-2xl text-foreground">{mastery.dueToday}</div>
            <div className="text-sm text-muted">due today</div>
          </Card>
        </div>

        <Card className="gap-0 p-4 text-sm text-muted">
          overall:{" "}
          <span className="text-foreground">{totals.attempted}</span>/{totals.problemCount}{" "}
          attempted · <span className="text-foreground">{totals.mastered}</span> mastered (
          {pct(totals.mastered, totals.problemCount)}%)
        </Card>
      </header>

      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-sm text-muted">coverage by tier</h2>
        {TIERS.map((tier) => {
          const t = mastery.tiers[tier];
          return (
            <Card key={tier} className="gap-1 p-4">
              <div className="flex items-baseline justify-between text-sm">
                <Badge variant="outline">{tier}</Badge>
                <span className="text-muted">
                  {t.patterns} patterns · {t.attempted}/{t.problemCount} attempted ·{" "}
                  {t.mastered} mastered
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded border border-border bg-surface-alt">
                <div
                  className="h-full bg-foreground"
                  style={{ width: `${pct(t.mastered, t.problemCount)}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-8">
        {KINDS.map((kind) => {
          const kindPatterns = mastery.perPattern.filter((p) => p.kind === kind);
          return (
            <div key={kind} className="flex flex-col gap-4">
              <h2 className="font-mono text-sm text-foreground">{KIND_LABEL[kind]}</h2>
              {TIERS.map((tier) => {
                const rows = kindPatterns.filter((p) => p.tier === tier);
                if (rows.length === 0) return null;
                return (
                  <div key={tier} className="flex flex-col gap-1">
                    <div>
                      <Badge variant="outline">{tier}</Badge>
                    </div>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="text-left text-xs text-muted">
                          <th className="py-1 font-normal">pattern</th>
                          <th className="py-1 text-right font-normal">problems</th>
                          <th className="py-1 text-right font-normal">attempted</th>
                          <th className="py-1 text-right font-normal">mastered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((p) => (
                          <PatternRow key={p.key} p={p} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PatternRow({ p }: { p: PatternMastery }) {
  const empty = p.problemCount === 0;
  const cell = empty ? "text-muted" : "text-foreground";
  return (
    <tr className="border-t border-border">
      <td className={`py-1.5 ${empty ? "text-muted" : "text-foreground"}`}>{p.label}</td>
      <td className={`py-1.5 text-right font-mono ${cell}`}>{p.problemCount}</td>
      <td className={`py-1.5 text-right font-mono ${cell}`}>{p.attempted}</td>
      <td className={`py-1.5 text-right font-mono ${cell}`}>{p.mastered}</td>
    </tr>
  );
}
