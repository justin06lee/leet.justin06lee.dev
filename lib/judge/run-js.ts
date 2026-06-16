// Client-only entry point for the JavaScript execution engine.
//
// Worker strategy: BLOB WORKER (see workers/js-runner.worker.ts for rationale).
// We import the worker body as a source string, wrap it in a Blob with an
// object URL, and spawn a classic Worker from it. CSP allows `worker-src 'self'
// blob:` and `script-src ... 'unsafe-eval'`. This sidesteps Turbopack's
// `new Worker(new URL(...))` TS-transpilation path, which is unreliable here.

import { WORKER_SOURCE } from "@/workers/js-runner.worker";
import type { JudgeCase, JudgingMode, RawCaseOutput } from "./types";

const TOTAL_TIMEOUT_MS = 5000;

interface WorkerResponse {
  id: number;
  outputs: RawCaseOutput[];
}

let nextId = 1;

export async function runJs(args: {
  code: string;
  mode: JudgingMode;
  functionName: string | null;
  cases: JudgeCase[];
}): Promise<RawCaseOutput[]> {
  if (typeof window === "undefined") {
    throw new Error("runJs can only run in the browser (client-side).");
  }

  const id = nextId++;
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    worker.terminate();
    URL.revokeObjectURL(url);
  };

  return new Promise<RawCaseOutput[]>((resolve) => {
    const finish = (outputs: RawCaseOutput[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outputs);
    };

    const timeoutOutputs = (): RawCaseOutput[] =>
      args.cases.map(() => ({
        got: null,
        stdout: "",
        error: "time limit exceeded",
        timeMs: TOTAL_TIMEOUT_MS,
      }));

    timer = setTimeout(() => finish(timeoutOutputs()), TOTAL_TIMEOUT_MS);

    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const data = ev.data;
      if (!data || data.id !== id) return;
      finish(data.outputs);
    };

    worker.onerror = (ev: ErrorEvent) => {
      const message = ev.message || "worker error";
      finish(
        args.cases.map(() => ({
          got: null,
          stdout: "",
          error: message,
          timeMs: 0,
        }))
      );
    };

    worker.postMessage({
      id,
      mode: args.mode,
      functionName: args.functionName,
      code: args.code,
      // Strip to the plain {input, expected} shape the worker expects.
      cases: args.cases.map((c) => ({ input: c.input, expected: c.expected })),
    });
  });
}
