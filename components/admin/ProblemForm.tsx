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
import { Input } from "@/components/chrome/input";
import { Textarea } from "@/components/chrome/textarea";
import Select from "@/components/chrome/select";
import { Button } from "@/components/chrome/button";

const PATTERN_OPTIONS = [
  { value: "", label: "— none —" },
  ...PATTERNS.map((p) => ({ value: p.key, label: p.label })),
];
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "easy" },
  { value: "medium", label: "medium" },
  { value: "hard", label: "hard" },
];
const JUDGING_MODE_OPTIONS: { value: JudgingMode; label: string }[] = [
  { value: "function", label: "function" },
  { value: "stdio", label: "stdio" },
];

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
        <p className="border border-white/20 px-3 py-2 text-sm text-white">{error}</p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">title</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">statement</span>
        <Textarea
          className="min-h-40 font-mono normal-case"
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">pattern</span>
        <Select
          value={pattern}
          onChange={(v) => setPattern(v)}
          options={PATTERN_OPTIONS}
          ariaLabel="pattern"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">difficulty</span>
        <Select
          value={difficulty}
          onChange={(v) => setDifficulty(v)}
          options={DIFFICULTY_OPTIONS}
          ariaLabel="difficulty"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">judging mode</span>
        <Select
          value={judgingMode}
          onChange={(v) => setJudgingMode(v)}
          options={JUDGING_MODE_OPTIONS}
          ariaLabel="judging mode"
        />
      </label>

      {judgingMode === "function" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/60">function name</span>
            <Input
              className="font-mono normal-case"
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-white/60">return type</span>
            <Input
              className="font-mono normal-case"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-white/60">params</span>
            {params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="font-mono normal-case"
                  placeholder="name"
                  value={p.name}
                  onChange={(e) => updateParam(i, { name: e.target.value })}
                />
                <Input
                  className="font-mono normal-case"
                  placeholder="type"
                  value={p.type}
                  onChange={(e) => updateParam(i, { type: e.target.value })}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => removeParam(i)}>
                  remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="dashed" size="sm" onClick={addParam}>
              add param
            </Button>
          </div>
        </>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">starter code — python</span>
        <Textarea
          className="min-h-32 font-mono normal-case"
          value={python}
          onChange={(e) => setPython(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-white/60">starter code — javascript</span>
        <Textarea
          className="min-h-32 font-mono normal-case"
          value={javascript}
          onChange={(e) => setJavascript(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-white/60">test cases</span>
        <TestCaseEditor initial={initialTests} onChange={setTests} />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/60">
        <input
          type="checkbox"
          className="accent-white"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        published
      </label>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="solid" disabled={isPending}>
          {isPending ? "saving…" : "save"}
        </Button>
        {initial?.id && (
          <Button type="button" variant="outline" disabled={isPending} onClick={onDelete}>
            delete
          </Button>
        )}
      </div>
    </form>
  );
}
