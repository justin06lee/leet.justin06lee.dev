import Link from "next/link";
import { listArticles, type Article } from "@/lib/articles";
import { listProblems, type Problem } from "@/lib/problems";
import { PATTERNS, type PatternKind, type Tier } from "@/lib/toolkit";

export const dynamic = "force-dynamic";

const KINDS: { key: PatternKind; label: string }[] = [
  { key: "structure", label: "data structures" },
  { key: "technique", label: "techniques & patterns" },
];

const TIERS: Tier[] = ["core", "intermediate", "stretch"];

export default async function ToolkitPage() {
  const [problems, articles] = await Promise.all([listProblems({}), listArticles()]);

  const problemsByPattern = new Map<string, Problem[]>();
  for (const problem of problems) {
    if (!problem.pattern) continue;
    const list = problemsByPattern.get(problem.pattern) ?? [];
    list.push(problem);
    problemsByPattern.set(problem.pattern, list);
  }

  const articleByPattern = new Map<string, Article>();
  for (const article of articles) {
    if (article.pattern && !articleByPattern.has(article.pattern)) {
      articleByPattern.set(article.pattern, article);
    }
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-24 lowercase">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl tracking-tight">toolkit</h1>
        <p className="text-muted">the syllabus map — every structure and technique, by tier.</p>
      </header>

      {KINDS.map((kind) => (
        <div key={kind.key} className="flex flex-col gap-8">
          <h2 className="font-mono text-2xl tracking-tight">{kind.label}</h2>
          {TIERS.map((tier) => {
            const patterns = PATTERNS.filter((p) => p.kind === kind.key && p.tier === tier);
            if (patterns.length === 0) return null;
            return (
              <div key={tier} className="flex flex-col gap-4">
                <h3 className="text-sm uppercase tracking-widest text-muted">{tier}</h3>
                <ul className="flex flex-col gap-4">
                  {patterns.map((pattern) => {
                    const article = articleByPattern.get(pattern.key);
                    const patternProblems = problemsByPattern.get(pattern.key) ?? [];
                    const hasContent = Boolean(article) || patternProblems.length > 0;
                    return (
                      <li
                        key={pattern.key}
                        className={`flex flex-col gap-1 ${hasContent ? "" : "text-muted"}`}
                      >
                        <span className={hasContent ? "text-foreground" : ""}>
                          {article ? (
                            <Link
                              href={`/articles/${article.slug}`}
                              className="underline underline-offset-4 hover:text-muted"
                            >
                              {pattern.label}
                            </Link>
                          ) : (
                            pattern.label
                          )}
                        </span>
                        {patternProblems.length > 0 && (
                          <ul className="flex flex-col gap-0.5 pl-4 text-sm">
                            {patternProblems.map((problem) => (
                              <li key={problem.id}>
                                <Link
                                  href={`/problems/${problem.slug}`}
                                  className="text-muted underline underline-offset-4 hover:text-foreground"
                                >
                                  {problem.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
