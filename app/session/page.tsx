import { requireUser } from "@/lib/auth-server";
import { buildDailySession } from "@/lib/session";
import { getTests } from "@/lib/problems";
import { getPattern } from "@/lib/toolkit";
import { SessionRunner } from "@/components/session/SessionRunner";
import { Button } from "@/components/chrome/button";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SessionPage() {
  const user = await requireUser(); // redirects to "/" if logged out
  const { items } = await buildDailySession(user.id);

  // Visible tests only — hidden tests must never reach the client.
  const testsPerItem = await Promise.all(
    items.map((item) => getTests(item.problem.id, { includeHidden: false })),
  );

  const runnerItems = items.map((item, i) => {
    const p = item.problem;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      statement: p.statement,
      judgingMode: p.judgingMode,
      functionName: p.functionName,
      starterCode: p.starterCode,
      patternLabel: getPattern(p.pattern ?? "")?.label ?? null,
      kind: item.kind,
      cases: testsPerItem[i].map((t) => ({ input: t.input, expected: t.expected })),
    };
  });

  if (runnerItems.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lowercase">
        <PageHeader
          title="session"
          subtitle="nothing due right now. the scheduler only surfaces a pattern when it's actually worth reviewing — so an empty queue means you're on track."
        />
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="solid" href="/toolkit">
            pick up a new pattern
          </Button>
          <Button variant="outline" href="/dashboard">
            back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <SessionRunner items={runnerItems} />;
}
