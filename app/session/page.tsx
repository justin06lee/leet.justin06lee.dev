import Link from "next/link";
import { requireUser } from "@/lib/auth-server";
import { buildDailySession } from "@/lib/session";
import { getTests } from "@/lib/problems";
import { getPattern } from "@/lib/toolkit";
import { SessionRunner } from "@/components/session/SessionRunner";

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
      <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
        <h1 className="font-mono text-2xl tracking-tight">session</h1>
        <p className="text-muted">
          nothing due right now —{" "}
          <Link href="/problems" className="text-foreground underline hover:no-underline">
            browse problems
          </Link>
        </p>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          back to dashboard
        </Link>
      </section>
    );
  }

  return <SessionRunner items={runnerItems} />;
}
