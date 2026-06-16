# Slice 3 — Free in-browser execution

Third slice of `leet.justin06lee.dev`. Builds on Slice 2 (problems with dual
judging modes + visible/hidden tests). Vision: `2026-06-15-leet-platform-vision.md`.

**Goal:** A user can write code in an in-browser editor and **run it against a
problem's visible test cases entirely client-side** — Python via Pyodide (WASM)
and JavaScript via a sandboxed Web Worker — for **both** judging modes (`function`
and `stdio`), seeing per-case pass/fail, expected vs. got, stdout, and errors.

This is the free tier. Zero server cost, zero untrusted-code liability (everything
runs in the user's own tab). Hidden tests + compiled languages = the paid server
judge (Slice 5, deferred).

## Non-goals
- No server execution / Judge0 (Slice 5).
- No running hidden tests (those are paid; not sent to the client).
- No saving submissions / progress (Slice 4).
- Only Python + JavaScript (the two free, browser-runnable languages).

## Architecture

**Execution runs in Web Workers** (off the main thread, isolated):
- **JavaScript:** a worker that evaluates user code and invokes it. No DOM, no
  network in the worker; wall-clock timeout enforced by the main thread
  (terminate the worker).
- **Python:** a worker that loads **Pyodide** (from the jsdelivr CDN) once, then
  executes user code.

**The worker only executes and returns raw outputs**; the main thread does the
pass/fail comparison using tested pure logic. This keeps the security/correctness-
sensitive comparison in unit-tested main-thread code and workers minimal.

Per judging mode:
- **`function` mode:** define the user function once; for each case, parse `input`
  as a JSON array of args, call `functionName(*args)`, capture the return value
  (serialized to JSON as `got`) + stdout + error.
- **`stdio` mode:** for each case, execute the whole user program fresh with the
  case's `input` fed as stdin; capture stdout as `got` + error.

### Modules
- `lib/judge/types.ts` — `Lang`, `JudgeCase`, `RawCaseOutput`, `CaseResult`, `RunResult`.
- `lib/judge/compare.ts` (PURE, unit-tested) — `compareCase(expected, raw, mode)`:
  - function mode: JSON-parse `expected` and `got`; deep-equal with number tolerance
    (1e-9 relative for floats), array order-sensitive, object key-order-insensitive.
    If `got` isn't valid JSON → fail.
  - stdio mode: normalize both (strip trailing spaces per line, collapse `\r\n`→`\n`,
    trim trailing blank lines) then string-equal.
  - Returns `{ passed, got, expected, stdout, error }`.
- `lib/judge/run-js.ts` (client) — spawns the JS worker, sends `{code, mode, functionName, cases}`, awaits `RawCaseOutput[]`, applies `compareCase`, returns `RunResult`. Enforces a per-run timeout (e.g. 5s) by terminating the worker.
- `lib/judge/run-python.ts` (client) — same contract against the Pyodide worker (longer first-run timeout since Pyodide must load; cache the worker/instance across runs).
- `lib/judge/run.ts` — `runProblem({lang, code, mode, functionName, cases})` dispatches to the right engine; the single entry point the UI calls.
- Workers: `workers/js-runner.worker.ts`, `workers/python-runner.worker.ts` (or Blob-based workers if `new URL(..., import.meta.url)` bundling is problematic in Next 16 — implementer picks whatever builds cleanly; document the choice).

### Worker contracts (postMessage)
Request: `{ id, code, mode, functionName, cases: {input,expected}[] }`.
Response: `{ id, outputs: { got: string|null, stdout: string, error: string|null, timeMs: number }[] }` OR `{ id, fatal: string }` (engine load failure).
Main thread pairs `outputs[i]` with `cases[i].expected` via `compareCase`.

## CSP / config (`next.config.ts`)
Extend the CSP to allow Pyodide + workers (currently `worker-src` absent,
`script-src 'self' 'unsafe-inline'`, `connect-src 'self'`):
- `script-src`: add `https://cdn.jsdelivr.net` and `'wasm-unsafe-eval'` (Pyodide needs WASM compilation; the JS worker uses `new Function`, allowed under `'unsafe-eval'`-free WASM? — `new Function`/`eval` requires `'unsafe-eval'`; add `'unsafe-eval'` ONLY if the JS engine needs it — prefer running user JS inside the worker via `new Function`, which DOES need `'unsafe-eval'`. Add `'unsafe-eval'` to `script-src`.).
- `worker-src 'self' blob:`
- `connect-src`: add `https://cdn.jsdelivr.net` (Pyodide fetches its wasm/packages).
- Keep `frame-ancestors 'none'`, etc.
Pin a Pyodide version (e.g. `v0.26.x`) via the CDN URL.

## Pyodide
- Load `pyodide.js` from `https://cdn.jsdelivr.net/pyodide/v<pinned>/full/` inside the
  worker via `importScripts`, then `loadPyodide({ indexURL })`.
- Reuse the loaded instance across runs (load once per worker lifetime).
- function mode: run user code to define the function in the Pyodide global scope;
  per case, `pyodide.runPython` a small dispatcher that `json.loads` the args, calls
  the function, and returns `json.dumps(result)`; capture stdout via Pyodide's
  `setStdout`/`batched` and stderr/exceptions as `error`.
- stdio mode: per case, set `sys.stdin` to a `StringIO(input)` and run the program,
  capturing stdout; reset between cases.

## JavaScript engine
- In the worker, build the user function via `new Function` (function mode: expect
  the user to define `functionName`; obtain it from the worker scope after eval, or
  wrap: `return (function(){ <userCode>; return typeof functionName!=="undefined" ? functionName : undefined })()`).
- function mode: call with `...JSON.parse(input)`, `got = JSON.stringify(returnValue)`.
- stdio mode: provide a minimal stdin (a `readline()`/`read()` shim over `input`)
  and capture `console.log`/`process.stdout`-style writes into `stdout`; `got = stdout`.
- Catch exceptions → `error`.

## UI — practice surface on `/problems/[slug]`
Replace the Slice 2 disabled "practice (coming soon)" affordance with a
`components/practice/PracticePanel.tsx` (client), fed by props the server page
already has (problem meta + `getTests(id,{includeHidden:false})`):
- Language selector (python / javascript) — defaults to whichever has starter code.
- `components/practice/CodeEditor.tsx` — **CodeMirror 6** with the language
  extension; seeded with `problem.starterCode[lang]` (or a sensible empty default);
  resettable to starter.
- "run" button → `runProblem(...)` against visible cases; shows a per-case results
  list (pass/fail, expected, got, stdout, error, timeMs) and a summary (`n/m passed`).
- Loading/initializing state while Pyodide downloads (first Python run).
- All client-side; no new API routes; no DB writes.

A signed-out user can still run (free, client-side) — but gate is irrelevant since
it's their own browser. (Future: persist attempts in Slice 4, which will require a
session.)

## Dependencies
- CodeMirror 6: `@uiw/react-codemirror`, `@codemirror/lang-python`,
  `@codemirror/lang-javascript` (and theme — a dark one, e.g. `@codemirror/theme-one-dark`).
- Pyodide loaded from CDN (no npm dep needed); pin the version in a constant.

## Seed (for testing + a starting demo)
Add `scripts/seed.ts` (run with `bun run scripts/seed.ts`) that idempotently inserts
a couple of published demo problems so the practice surface is testable end-to-end:
- `two-sum` (function mode, `twoSum(nums, target)`, python+js starter, 2 visible +
  1 hidden test).
- `sum-to-n` or `a-plus-b` (stdio mode: read two ints, print sum; 2 visible tests).
Idempotent via slug check. Not wired into the app; a dev/owner convenience.

## Testing
- `compare.test.ts` (Vitest, Node) — exhaustive: function-mode deep equality
  (ints, floats w/ tolerance, nested arrays, objects key-order-insensitive,
  order-sensitive arrays, invalid-JSON got → fail); stdio normalization
  (trailing whitespace, CRLF, trailing newlines).
- `harness`/engine logic that is pure can be unit-tested; actual Pyodide/worker
  execution is verified manually in a browser (documented checklist) — Node/Vitest
  can't run the WASM worker reliably.
- `bun run build` + `bun run lint` pass.

## Definition of done
- `bun run test` (incl. new compare tests), `build`, `lint` pass.
- On `/problems/[slug]` for a seeded problem: editor loads with starter code, "run"
  executes visible tests in-browser for both Python and JS, and pass/fail is correct
  for a correct solution and for a deliberately wrong one — in both judging modes.
  (Live browser run is the manual acceptance step; orchestrator will attempt an
  automated smoke test if browser tooling is available.)
