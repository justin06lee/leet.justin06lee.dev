import type { Lang, JudgingMode, JudgeCase, RunResult, RawCaseOutput } from "./types";
import { compareCase } from "./compare";
import { runJs } from "./run-js";
import { runPython } from "./run-python";

export async function runProblem(args: {
  lang: Lang;
  code: string;
  mode: JudgingMode;
  functionName: string | null;
  cases: JudgeCase[];
}): Promise<RunResult> {
  const { lang, code, mode, functionName, cases } = args;
  const total = cases.length;

  try {
    let raws: RawCaseOutput[];

    if (lang === "python") {
      const out = await runPython({ code, mode, functionName, cases });
      if ("fatal" in out) {
        return {
          results: [],
          passedCount: 0,
          total,
          allPassed: false,
          fatal: out.fatal,
        };
      }
      raws = out;
    } else {
      raws = await runJs({ code, mode, functionName, cases });
    }

    const results = raws.map((raw, i) =>
      compareCase(cases[i].expected, raw, mode, i),
    );
    const passedCount = results.filter((r) => r.passed).length;

    return {
      results,
      passedCount,
      total,
      allPassed: passedCount === total && total > 0,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      results: [],
      passedCount: 0,
      total,
      allPassed: false,
      fatal: message,
    };
  }
}
