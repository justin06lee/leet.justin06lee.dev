import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { getMastery } from "@/lib/mastery";
import { buildDailySession } from "@/lib/session";
import type { Tier } from "@/lib/toolkit";

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
        <div className="rounded border border-border bg-surface px-4 py-3">
          <div className="font-mono text-2xl text-foreground">{mastery.dueToday}</div>
          <div className="text-sm text-muted">due today</div>
        </div>
        <div className="rounded border border-border bg-surface px-4 py-3">
          <div className="font-mono text-2xl text-foreground">{mastery.streakDays}</div>
          <div className="text-sm text-muted">day streak</div>
        </div>
        <div className="rounded border border-border bg-surface px-4 py-3">
          <div className="font-mono text-2xl text-foreground">{mastery.totalReviews}</div>
          <div className="text-sm text-muted">reviews</div>
        </div>
      </div>

      {hasSession ? (
        <Link
          href="/session"
          className="rounded border border-foreground bg-foreground px-4 py-3 text-center font-mono text-background hover:opacity-90"
        >
          start daily session ({items.length})
        </Link>
      ) : (
        <div className="rounded border border-border bg-surface px-4 py-3 text-center text-muted">
          <span className="font-mono">nothing due</span> —{" "}
          <Link href="/problems" className="text-foreground underline underline-offset-4">
            browse problems
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-mono text-sm text-muted">coverage by tier</h2>
        {TIERS.map((tier) => {
          const t = mastery.tiers[tier];
          const pct = t.problemCount > 0 ? Math.round((t.mastered / t.problemCount) * 100) : 0;
          return (
            <div key={tier} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground">{tier}</span>
                <span className="text-muted">
                  {t.attempted}/{t.problemCount} attempted, {t.mastered} mastered
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded border border-border bg-surface-alt">
                <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <nav className="flex flex-wrap gap-4 text-sm text-muted">
        <Link href="/mastery" className="hover:text-foreground underline underline-offset-4">
          mastery
        </Link>
        <Link href="/problems" className="hover:text-foreground underline underline-offset-4">
          problems
        </Link>
        <Link href="/toolkit" className="hover:text-foreground underline underline-offset-4">
          toolkit
        </Link>
      </nav>
    </section>
  );
}
