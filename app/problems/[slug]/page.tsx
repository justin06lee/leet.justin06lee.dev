import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getProblemBySlug, getTests } from "@/lib/problems";
import { getPattern } from "@/lib/toolkit";
import { PracticePanel } from "@/components/practice/PracticePanel";

export const dynamic = "force-dynamic";

const BADGE = "rounded border border-border px-2 py-0.5 text-sm text-muted";

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);
  if (!problem) notFound();

  // visible examples only — hidden tests are never fetched on the public page.
  const examples = await getTests(problem.id, { includeHidden: false });
  const pattern = problem.pattern ? getPattern(problem.pattern) : undefined;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <header className="flex flex-col gap-3">
        <h1 className="font-mono text-3xl tracking-tight">{problem.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {pattern && <span className={BADGE}>{pattern.label}</span>}
          <span className={BADGE}>{problem.difficulty}</span>
          <span className={BADGE}>{problem.judgingMode}</span>
        </div>
      </header>

      <Markdown content={problem.statement} />

      {examples.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xl tracking-tight">examples</h2>
          {examples.map((example) => (
            <div key={example.id} className="flex flex-col gap-2">
              <pre className="overflow-x-auto rounded border border-border bg-surface p-4 font-mono text-sm">
                <span className="text-muted">input</span>
                {"\n"}
                {example.input}
              </pre>
              <pre className="overflow-x-auto rounded border border-border bg-surface p-4 font-mono text-sm">
                <span className="text-muted">expected</span>
                {"\n"}
                {example.expected}
              </pre>
            </div>
          ))}
        </div>
      )}

      <PracticePanel
        slug={problem.slug}
        judgingMode={problem.judgingMode}
        functionName={problem.functionName}
        starterCode={problem.starterCode}
        cases={examples.map((t) => ({ input: t.input, expected: t.expected }))}
      />
    </section>
  );
}
