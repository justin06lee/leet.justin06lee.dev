"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/practice/CodeEditor";
import { Button } from "@/components/chrome/button";
import { Segmented } from "@/components/chrome/segmented";
import { Badge } from "@/components/chrome/badge";
import { Card } from "@/components/chrome/card";
import { runProblem } from "@/lib/judge/run";
import type { Lang, JudgingMode, RunResult } from "@/lib/judge/types";

const ALL_LANGS: Lang[] = ["python", "javascript"];

function langsFrom(starterCode: Record<string, string>): Lang[] {
  const available = ALL_LANGS.filter((l) => l in starterCode);
  return available.length > 0 ? available : ALL_LANGS;
}

export function PracticePanel({
  judgingMode,
  functionName,
  starterCode,
  cases,
}: {
  slug: string;
  judgingMode: JudgingMode;
  functionName: string | null;
  starterCode: Record<string, string>;
  cases: { input: string; expected: string }[];
}) {
  const langs = langsFrom(starterCode);
  const [lang, setLang] = useState<Lang>(langs[0]);
  const [code, setCode] = useState<string>(starterCode[langs[0]] ?? "");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  function selectLang(next: Lang) {
    setLang(next);
    setCode(starterCode[next] ?? "");
    setResult(null);
  }

  function resetToStarter() {
    setCode(starterCode[lang] ?? "");
  }

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const r = await runProblem({
        lang,
        code,
        mode: judgingMode,
        functionName,
        cases,
      });
      setResult(r);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-mono text-xl tracking-tight">practice</h2>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Lang>
          value={lang}
          onChange={selectLang}
          options={langs.map((l) => ({ value: l, label: l }))}
          ariaLabel="language"
        />
        <Button variant="ghost" size="sm" onClick={resetToStarter} className="ml-auto">
          reset to starter
        </Button>
      </div>

      <div className="overflow-hidden rounded border border-border">
        <CodeEditor lang={lang} value={code} onChange={setCode} />
      </div>

      <div className="flex items-center gap-3">
        <Button variant="solid" onClick={run} disabled={running}>
          {running ? "running…" : "run"}
        </Button>
        {running && lang === "python" && (
          <span className="text-sm text-muted">
            loading python runtime (first run can take a few seconds)…
          </span>
        )}
      </div>

      {result && (
        <div className="flex flex-col gap-3">
          {result.fatal ? (
            <pre className="overflow-x-auto rounded border border-red-500/40 bg-surface p-4 font-mono text-sm text-red-400">
              {result.fatal}
            </pre>
          ) : (
            <>
              <p
                className={`text-sm ${
                  result.allPassed ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.passedCount}/{result.total} passed
              </p>

              <div className="flex flex-col gap-3">
                {result.results.map((c) => (
                  <Card key={c.index} className="gap-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">case {c.index + 1}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-muted">{c.timeMs}ms</span>
                        <Badge variant={c.passed ? "solid" : "outline"}>
                          {c.passed ? "pass" : "fail"}
                        </Badge>
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted">expected</span>
                      <pre className="overflow-x-auto font-mono text-sm">
                        {c.expected}
                      </pre>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-muted">got</span>
                      <pre className="overflow-x-auto font-mono text-sm">
                        {c.got ?? ""}
                      </pre>
                    </div>

                    {c.stdout && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted">stdout</span>
                        <pre className="overflow-x-auto font-mono text-sm">
                          {c.stdout}
                        </pre>
                      </div>
                    )}

                    {c.error && (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-muted">error</span>
                        <pre className="overflow-x-auto font-mono text-sm text-red-400">
                          {c.error}
                        </pre>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
