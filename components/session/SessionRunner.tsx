"use client";

import { useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";
import { PracticePanel } from "@/components/practice/PracticePanel";
import { recordReviewAction } from "@/app/dashboard/actions";

export interface SessionRunnerItem {
  id: string;
  slug: string;
  title: string;
  statement: string;
  judgingMode: "function" | "stdio";
  functionName: string | null;
  starterCode: Record<string, string>;
  patternLabel: string | null;
  kind: "review" | "new";
  cases: { input: string; expected: string }[];
}

const GRADES: { label: string; grade: number }[] = [
  { label: "again", grade: 0 },
  { label: "hard", grade: 1 },
  { label: "ok", grade: 2 },
  { label: "good", grade: 3 },
  { label: "easy", grade: 4 },
];

function gradeLabel(grade: number): string {
  return GRADES.find((g) => g.grade === grade)?.label ?? String(grade);
}

export function SessionRunner({ items }: { items: SessionRunnerItem[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [grades, setGrades] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueAtISO, setDueAtISO] = useState<string | null>(null);

  if (done) {
    const breakdown = GRADES.map((g) => ({
      label: g.label,
      count: grades.filter((x) => x === g.grade).length,
    })).filter((b) => b.count > 0);

    return (
      <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
        <h1 className="font-mono text-2xl tracking-tight">done for now</h1>
        <p className="text-muted">come back tomorrow.</p>
        <p className="text-foreground">{grades.length} items graded</p>
        {breakdown.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {breakdown.map((b) => (
              <li key={b.label} className="text-muted">
                {b.label}: <span className="text-foreground">{b.count}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-foreground underline hover:no-underline">
            dashboard
          </Link>
          <Link href="/mastery" className="text-sm text-foreground underline hover:no-underline">
            mastery
          </Link>
        </div>
      </section>
    );
  }

  const item = items[index];
  const showPattern = item.kind === "review" || revealed;
  const graded = dueAtISO !== null;

  async function grade(g: number) {
    setPending(true);
    setError(null);
    try {
      const r = await recordReviewAction(item.id, g);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setGrades((prev) => [...prev, g]);
      setRevealed(true);
      setDueAtISO(r.dueAtISO);
    } finally {
      setPending(false);
    }
  }

  function next() {
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setRevealed(false);
      setDueAtISO(null);
      setError(null);
    } else {
      setDone(true);
    }
  }

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <div className="flex items-center justify-between text-sm text-muted">
        <span className="font-mono">
          case {index + 1} / {items.length}
        </span>
        <span>{item.kind}</span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-mono text-2xl tracking-tight">{item.title}</h1>
        {showPattern ? (
          <p className="text-sm text-muted">
            pattern: <span className="text-foreground">{item.patternLabel ?? "—"}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">pattern: hidden</p>
        )}
      </div>

      <Markdown content={item.statement} />

      <PracticePanel
        key={item.id}
        slug={item.slug}
        judgingMode={item.judgingMode}
        functionName={item.functionName}
        starterCode={item.starterCode}
        cases={item.cases}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted">how did that go?</span>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <button
              key={g.grade}
              type="button"
              onClick={() => grade(g.grade)}
              disabled={pending || graded}
              className="rounded border border-border px-4 py-2 text-sm text-foreground hover:border-foreground disabled:cursor-not-allowed disabled:text-muted"
            >
              {g.label}
            </button>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {graded && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-muted">
              graded <span className="text-foreground">{gradeLabel(grades[grades.length - 1])}</span> ·
              next due <span className="text-foreground">{dueAtISO}</span>
            </span>
            <button
              type="button"
              onClick={next}
              className="rounded border border-border px-4 py-2 text-sm text-foreground hover:border-foreground"
            >
              {index + 1 < items.length ? "next" : "finish"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
