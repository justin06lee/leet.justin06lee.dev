"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PATTERNS } from "@/lib/toolkit";
import {
  saveProblemAction,
  saveProblemTestsAction,
  deleteProblemAction,
  type ProblemInput,
} from "@/app/admin/actions";
import type { Problem, ProblemParam, ProblemTest, Difficulty, JudgingMode } from "@/lib/problems";
import TestCaseEditor, { type TestCase } from "./TestCaseEditor";

const FIELD =
  "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground lowercase";
const BUTTON =
  "rounded border border-border bg-surface px-3 py-1 text-sm text-foreground lowercase hover:border-foreground disabled:opacity-50";
const SMALL_BUTTON =
  "rounded border border-border bg-surface px-2 py-1 text-xs text-foreground lowercase hover:border-foreground disabled:opacity-50";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const JUDGING_MODES: JudgingMode[] = ["function", "stdio"];

export default function ProblemForm({
  initial,
  initialTests,
}: {
  initial?: Problem;
  initialTests?: ProblemTest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [statement, setStatement] = useState(initial?.statement ?? "");
  const [pattern, setPattern] = useState(initial?.pattern ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? "medium");
  const [judgingMode, setJudgingMode] = useState<JudgingMode>(initial?.judgingMode ?? "function");
  const [functionName, setFunctionName] = useState(initial?.functionName ?? "");
  const [returnType, setReturnType] = useState(initial?.returnType ?? "");
  const [params, setParams] = useState<ProblemParam[]>(initial?.params ?? []);
  const [python, setPython] = useState(initial?.starterCode?.python ?? "");
  const [javascript, setJavascript] = useState(initial?.starterCode?.javascript ?? "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [tests, setTests] = useState<TestCase[]>(
    (initialTests ?? []).map((t) => ({ kind: t.kind, input: t.input, expected: t.expected })),
  );

  function addParam() {
    setParams([...params, { name: "", type: "" }]);
  }
  function updateParam(index: number, patch: Partial<ProblemParam>) {
    setParams(params.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function removeParam(index: number) {
    setParams(params.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const starterCode: Record<string, string> = {};
    if (python.trim()) starterCode.python = python;
    if (javascript.trim()) starterCode.javascript = javascript;

    const input: ProblemInput = {
      id: initial?.id,
      title,
      statement,
      pattern: pattern || null,
      difficulty,
      judgingMode,
      functionName: judgingMode === "function" ? functionName || null : null,
      params: judgingMode === "function" ? params : [],
      returnType: judgingMode === "function" ? returnType || null : null,
      starterCode,
      published,
    };

    startTransition(async () => {
      const result = await saveProblemAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await saveProblemTestsAction(result.id, tests);
      router.push("/admin/problems");
      router.refresh();
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      await deleteProblemAction(initial.id);
      router.push("/admin/problems");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4 lowercase">
      {error && (
        <p className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">title</span>
        <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">statement</span>
        <textarea
          className={`${FIELD} min-h-40 font-mono normal-case`}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">pattern</span>
        <select className={FIELD} value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="">none</option>
          {PATTERNS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">difficulty</span>
        <select
          className={FIELD}
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">judging mode</span>
        <select
          className={FIELD}
          value={judgingMode}
          onChange={(e) => setJudgingMode(e.target.value as JudgingMode)}
        >
          {JUDGING_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {judgingMode === "function" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">function name</span>
            <input
              className={`${FIELD} font-mono normal-case`}
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">return type</span>
            <input
              className={`${FIELD} font-mono normal-case`}
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">params</span>
            {params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${FIELD} font-mono normal-case`}
                  placeholder="name"
                  value={p.name}
                  onChange={(e) => updateParam(i, { name: e.target.value })}
                />
                <input
                  className={`${FIELD} font-mono normal-case`}
                  placeholder="type"
                  value={p.type}
                  onChange={(e) => updateParam(i, { type: e.target.value })}
                />
                <button type="button" className={SMALL_BUTTON} onClick={() => removeParam(i)}>
                  remove
                </button>
              </div>
            ))}
            <button type="button" className={SMALL_BUTTON} onClick={addParam}>
              add param
            </button>
          </div>
        </>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">starter code — python</span>
        <textarea
          className={`${FIELD} min-h-32 font-mono normal-case`}
          value={python}
          onChange={(e) => setPython(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">starter code — javascript</span>
        <textarea
          className={`${FIELD} min-h-32 font-mono normal-case`}
          value={javascript}
          onChange={(e) => setJavascript(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">test cases</span>
        <TestCaseEditor initial={initialTests} onChange={setTests} />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        published
      </label>

      <div className="flex items-center gap-2">
        <button type="submit" className={BUTTON} disabled={isPending}>
          {isPending ? "saving…" : "save"}
        </button>
        {initial?.id && (
          <button type="button" className={BUTTON} disabled={isPending} onClick={onDelete}>
            delete
          </button>
        )}
      </div>
    </form>
  );
}
