"use client";

import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
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

/** Monospace output block — square, bordered, scrolls rather than wraps. */
function Output({ label, value, tone }: { label: string; value: string; tone?: "error" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-xs text-white/40">{label}</span>
      <pre
        className={`overflow-x-auto border border-white/10 bg-white/[0.03] p-3 font-mono text-[13px] leading-6 ${
          tone === "error" ? "text-red-300" : "text-white/85"
        }`}
      >
        {value}
      </pre>
    </div>
  );
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
      const r = await runProblem({ lang, code, mode: judgingMode, functionName, cases });
      setResult(r);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">practice</h2>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Lang>
          value={lang}
          onChange={selectLang}
          options={langs.map((l) => ({ value: l, label: l }))}
          ariaLabel="language"
        />
        <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetToStarter} className="ml-auto">
          reset to starter
        </Button>
      </div>

      <div className="overflow-hidden border border-white/10">
        <CodeEditor lang={lang} value={code} onChange={setCode} />
      </div>

      <div className="flex items-center gap-3">
        <Button variant="solid" icon={Play} onClick={run} disabled={running}>
          {running ? "running…" : "run"}
        </Button>
        {running && lang === "python" ? (
          <span className="text-sm text-white/50">
            loading python runtime (first run can take a few seconds)…
          </span>
        ) : null}
      </div>

      {result ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          {result.fatal ? (
            <pre className="overflow-x-auto border border-red-400/60 bg-red-400/10 p-4 font-mono text-[13px] leading-6 text-red-300">
              {result.fatal}
            </pre>
          ) : (
            <>
              <p
                className={`font-mono text-sm ${
                  result.allPassed ? "text-white" : "text-red-300"
                }`}
              >
                {result.passedCount}/{result.total} passed
              </p>

              {result.results.map((c) => (
                <Card key={c.index} className="gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-white/40">case {c.index + 1}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-white/40">{c.timeMs}ms</span>
                      <Badge variant={c.passed ? "solid" : "outline"}>
                        {c.passed ? "pass" : "fail"}
                      </Badge>
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Output label="expected" value={c.expected} />
                    <Output label="got" value={c.got ?? ""} />
                  </div>

                  {c.stdout ? <Output label="stdout" value={c.stdout} /> : null}
                  {c.error ? <Output label="error" value={c.error} tone="error" /> : null}
                </Card>
              ))}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
