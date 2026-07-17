import Link from "next/link";
import { notFound } from "next/navigation";
import { Prose } from "@/components/chrome/prose";
import { Badge } from "@/components/chrome/badge";
import { Breadcrumb } from "@/components/chrome/breadcrumb";
import { CodeBlock } from "@/components/chrome/code-block";
import { FadeIn } from "@/components/chrome/fade-in";
import { getProblemBySlug, getTests } from "@/lib/problems";
import { getPattern } from "@/lib/toolkit";
import { PracticePanel } from "@/components/practice/PracticePanel";

export const dynamic = "force-dynamic";

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);
  if (!problem) notFound();

  // visible examples only — hidden tests are never fetched on the public page.
  const examples = await getTests(problem.id, { includeHidden: false });
  const pattern = problem.pattern ? getPattern(problem.pattern) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lowercase">
      <FadeIn>
        <Breadcrumb
          linkComponent={Link}
          items={[
            { label: "problems", href: "/problems" },
            ...(pattern ? [{ label: pattern.label, href: `/patterns/${pattern.key}` }] : []),
            { label: problem.title },
          ]}
        />
      </FadeIn>

      <FadeIn delay={0.05} className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
          {problem.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {pattern ? (
            <Link href={`/patterns/${pattern.key}`}>
              <Badge variant="ghost">{pattern.label}</Badge>
            </Link>
          ) : null}
          <Badge variant="outline">{problem.difficulty}</Badge>
          <Badge variant="outline">{problem.judgingMode}</Badge>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Prose linkComponent={Link}>{problem.statement}</Prose>
      </FadeIn>

      {examples.length > 0 ? (
        <FadeIn delay={0.15} className="flex flex-col gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
            examples
          </h2>
          <div className="flex flex-col gap-4">
            {examples.map((example, i) => (
              <div key={example.id} className="flex flex-col gap-2">
                <span className="font-mono text-xs text-white/40">case {i + 1}</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-xs text-white/40">input</span>
                    <CodeBlock code={example.input ?? ""} language="text" copyable={false} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-mono text-xs text-white/40">expected</span>
                    <CodeBlock code={example.expected ?? ""} language="text" copyable={false} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      ) : null}

      <PracticePanel
        slug={problem.slug}
        judgingMode={problem.judgingMode}
        functionName={problem.functionName}
        starterCode={problem.starterCode}
        cases={examples.map((t) => ({ input: t.input, expected: t.expected }))}
      />
    </div>
  );
}
