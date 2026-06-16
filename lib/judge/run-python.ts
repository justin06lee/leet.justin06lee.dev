// Client-only entry point for the Python execution engine (Pyodide / WASM).
//
// Worker strategy: BLOB WORKER (see workers/python-runner.worker.ts for the
// rationale). Unlike the JS engine, the Pyodide worker is EXPENSIVE to spin up
// (it downloads the WASM runtime from the jsdelivr CDN on first use), so we keep
// a MODULE-LEVEL worker alive across calls and reuse it — Pyodide loads once per
// worker lifetime. We only tear the worker down on timeout (the interpreter may
// be wedged) and re-create it lazily on the next call.

import { WORKER_SOURCE } from "@/workers/python-runner.worker";
import { PYODIDE_INDEX_URL } from "./pyodide-version";
import type { JudgeCase, JudgingMode, RawCaseOutput } from "./types";

// First run also downloads the ~several-MB Pyodide runtime; allow plenty of time.
const FIRST_RUN_TIMEOUT_MS = 30000;
// Subsequent runs reuse the loaded runtime, so a tight budget applies.
const SUBSEQUENT_TIMEOUT_MS = 10000;

interface WorkerSuccess {
  id: number;
  outputs: RawCaseOutput[];
}
interface WorkerFatal {
  id: number;
  fatal: string;
}
type WorkerResponse = WorkerSuccess | WorkerFatal;

let nextId = 1;

// Module-level reusable worker + the object URL backing it (so we can revoke).
let worker: Worker | null = null;
let workerUrl: string | null = null;

function ensureWorker(): { worker: Worker; isFirstRun: boolean } {
  if (worker) return { worker, isFirstRun: false };
  const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
  workerUrl = URL.createObjectURL(blob);
  worker = new Worker(workerUrl);
  return { worker, isFirstRun: true };
}

function resetWorker(): void {
  if (worker) worker.terminate();
  if (workerUrl) URL.revokeObjectURL(workerUrl);
  worker = null;
  workerUrl = null;
}

export async function runPython(args: {
  code: string;
  mode: JudgingMode;
  functionName: string | null;
  cases: JudgeCase[];
}): Promise<RawCaseOutput[] | { fatal: string }> {
  if (typeof window === "undefined") {
    throw new Error("runPython can only run in the browser (client-side).");
  }

  const id = nextId++;
  const { worker: w, isFirstRun } = ensureWorker();
  const timeoutMs = isFirstRun ? FIRST_RUN_TIMEOUT_MS : SUBSEQUENT_TIMEOUT_MS;

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<RawCaseOutput[] | { fatal: string }>((resolve) => {
    const detach = () => {
      if (timer !== undefined) clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
    };
    const finish = (value: RawCaseOutput[] | { fatal: string }) => {
      if (settled) return;
      settled = true;
      detach();
      resolve(value);
    };

    const onMessage = (ev: MessageEvent<WorkerResponse>) => {
      const data = ev.data;
      if (!data || data.id !== id) return;
      if ("fatal" in data) {
        // A failed runtime load: the worker resets its cached instance, but the
        // worker process is fine to reuse, so we keep it.
        finish({ fatal: data.fatal });
        return;
      }
      finish(data.outputs);
    };

    const onError = (ev: ErrorEvent) => {
      // A hard worker crash — discard it so the next call re-loads Pyodide.
      resetWorker();
      finish({ fatal: ev.message || "python worker error" });
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);

    timer = setTimeout(() => {
      // The interpreter may be wedged (e.g. infinite loop) — terminate and reset
      // the cached worker so the next call starts fresh.
      resetWorker();
      finish(
        args.cases.map(() => ({
          got: null,
          stdout: "",
          error: "time limit exceeded",
          timeMs: timeoutMs,
        }))
      );
    }, timeoutMs);

    w.postMessage({
      id,
      mode: args.mode,
      functionName: args.functionName,
      code: args.code,
      // Strip to the plain {input, expected} shape the worker expects.
      cases: args.cases.map((c) => ({ input: c.input, expected: c.expected })),
      indexURL: PYODIDE_INDEX_URL,
    });
  });
}
