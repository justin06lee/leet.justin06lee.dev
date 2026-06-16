"use client";

import { useState } from "react";
import type { ProblemTest } from "@/lib/problems";

export interface TestCase {
  kind: "visible" | "hidden";
  input: string;
  expected: string;
}

const FIELD =
  "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground";
const BUTTON =
  "rounded border border-border bg-surface px-2 py-1 text-xs text-foreground lowercase hover:border-foreground disabled:opacity-50";

function toTestCase(t: Pick<ProblemTest, "kind" | "input" | "expected">): TestCase {
  return { kind: t.kind, input: t.input, expected: t.expected };
}

export default function TestCaseEditor({
  initial,
  onChange,
}: {
  initial?: Array<Pick<ProblemTest, "kind" | "input" | "expected">>;
  onChange: (tests: TestCase[]) => void;
}) {
  const [tests, setTests] = useState<TestCase[]>((initial ?? []).map(toTestCase));

  function commit(next: TestCase[]) {
    setTests(next);
    onChange(next);
  }

  function update(index: number, patch: Partial<TestCase>) {
    commit(tests.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function add() {
    commit([...tests, { kind: "visible", input: "", expected: "" }]);
  }

  function remove(index: number) {
    commit(tests.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= tests.length) return;
    const next = [...tests];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  return (
    <div className="flex flex-col gap-3 lowercase">
      <p className="text-xs text-muted">
        function mode: input = json args array, expected = json value · stdio mode: input = stdin
        text, expected = stdout text
      </p>

      {tests.map((t, i) => (
        <div key={i} className="flex flex-col gap-2 rounded border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <select
              className={FIELD}
              value={t.kind}
              onChange={(e) => update(i, { kind: e.target.value as TestCase["kind"] })}
            >
              <option value="visible">visible</option>
              <option value="hidden">hidden</option>
            </select>
            <span className="text-xs text-muted">#{i + 1}</span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" className={BUTTON} onClick={() => move(i, -1)} disabled={i === 0}>
                up
              </button>
              <button
                type="button"
                className={BUTTON}
                onClick={() => move(i, 1)}
                disabled={i === tests.length - 1}
              >
                down
              </button>
              <button type="button" className={BUTTON} onClick={() => remove(i)}>
                remove
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">input</span>
            <textarea
              className={`${FIELD} min-h-16 font-mono`}
              value={t.input}
              onChange={(e) => update(i, { input: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">expected</span>
            <textarea
              className={`${FIELD} min-h-16 font-mono`}
              value={t.expected}
              onChange={(e) => update(i, { expected: e.target.value })}
            />
          </label>
        </div>
      ))}

      <button type="button" className={BUTTON} onClick={add}>
        add test case
      </button>
    </div>
  );
}
