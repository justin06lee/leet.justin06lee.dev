import { requireUser } from "@/lib/auth-server";
import { getMastery } from "@/lib/mastery";
import { buildDailySession } from "@/lib/session";
import type { Tier } from "@/lib/toolkit";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";
import { Card } from "@/components/chrome/card";

export const dynamic = "force-dynamic";

const TIERS: Tier[] = ["core", "intermediate", "stretch"];

export default async function Dashboard() {
  const user = await requireUser(); // redirects to "/" if logged out

  const mastery = await getMastery(user.id);
  const { items } = await buildDailySession(user.id);

  const hasSession = items.length > 0;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-24 lowercase">
      <p className="text-muted">
        signed in as <span className="text-foreground">{user.githubLogin}</span> · tier:{" "}
        <span className="text-foreground">{user.tier}</span>
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Card className="gap-0 p-4">
          <div className="font-mono text-2xl text-foreground">{mastery.dueToday}</div>
          <div className="text-sm text-muted">due today</div>
        </Card>
        <Card className="gap-0 p-4">
          <div className="font-mono text-2xl text-foreground">{mastery.streakDays}</div>
          <div className="text-sm text-muted">day streak</div>
        </Card>
        <Card className="gap-0 p-4">
          <div className="font-mono text-2xl text-foreground">{mastery.totalReviews}</div>
          <div className="text-sm text-muted">reviews</div>
        </Card>
      </div>

      {hasSession ? (
        <Button variant="solid" fullWidth href="/session" className="font-mono">
          start daily session ({items.length})
        </Button>
      ) : (
        <Card className="items-center gap-0 p-4 text-center text-muted">
          <span>
            <span className="font-mono">nothing due</span> —{" "}
            <Button variant="link" size="sm" href="/problems" className="px-0">
              browse problems
            </Button>
          </span>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-sm text-muted">coverage by tier</h2>
        {TIERS.map((tier) => {
          const t = mastery.tiers[tier];
          const pct = t.problemCount > 0 ? Math.round((t.mastered / t.problemCount) * 100) : 0;
          return (
            <Card key={tier} className="gap-1 p-4">
              <div className="flex items-baseline justify-between text-sm">
                <Badge variant="outline">{tier}</Badge>
                <span className="text-muted">
                  {t.attempted}/{t.problemCount} attempted, {t.mastered} mastered
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded border border-border bg-surface-alt">
                <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <Button variant="link" size="sm" href="/mastery" className="px-0">
          mastery
        </Button>
        <Button variant="link" size="sm" href="/problems" className="px-0">
          problems
        </Button>
        <Button variant="link" size="sm" href="/toolkit" className="px-0">
          toolkit
        </Button>
      </nav>
    </section>
  );
}
