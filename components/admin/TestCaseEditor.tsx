"use client";

import { useState } from "react";
import type { ProblemTest } from "@/lib/problems";
import { Textarea } from "@/components/chrome/textarea";
import Select from "@/components/chrome/select";
import { Button } from "@/components/chrome/button";

export interface TestCase {
  kind: "visible" | "hidden";
  input: string;
  expected: string;
}

const KIND_OPTIONS: { value: TestCase["kind"]; label: string }[] = [
  { value: "visible", label: "visible" },
  { value: "hidden", label: "hidden" },
];

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
      <p className="text-xs text-white/60">
        function mode: input = json args array, expected = json value · stdio mode: input = stdin
        text, expected = stdout text
      </p>

      {tests.map((t, i) => (
        <div key={i} className="flex flex-col gap-2 border border-white/10 p-3">
          <div className="flex items-center gap-2">
            <Select
              value={t.kind}
              onChange={(v) => update(i, { kind: v })}
              options={KIND_OPTIONS}
              size="compact"
              ariaLabel="test kind"
              className="w-28"
            />
            <span className="text-xs text-white/60">#{i + 1}</span>
            <div className="ml-auto flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => move(i, 1)}
                disabled={i === tests.length - 1}
              >
                down
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(i)}>
                remove
              </Button>
            </div>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/60">input</span>
            <Textarea
              className="min-h-16 font-mono"
              value={t.input}
              onChange={(e) => update(i, { input: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-white/60">expected</span>
            <Textarea
              className="min-h-16 font-mono"
              value={t.expected}
              onChange={(e) => update(i, { expected: e.target.value })}
            />
          </label>
        </div>
      ))}

      <Button type="button" variant="dashed" size="sm" onClick={add}>
        add test case
      </Button>
    </div>
  );
}
