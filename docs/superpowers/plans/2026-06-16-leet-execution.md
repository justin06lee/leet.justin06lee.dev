# Slice 3 — Free in-browser execution Implementation Plan

> Use superpowers:subagent-driven-development. TDD for the pure `compare` logic. Commit per task.

**Goal:** In-browser code editor (CodeMirror 6) + Python (Pyodide) & JavaScript (sandboxed worker) execution against a problem's VISIBLE tests, for both `function` and `stdio` judging modes.

**Architecture:** Workers execute and return raw outputs; the main thread compares via pure tested logic. Single entry `runProblem()`. No server, no DB writes. Builds on Slice 2.

**Tech Stack:** adds `@uiw/react-codemirror`, `@codemirror/lang-python`, `@codemirror/lang-javascript`, `@codemirror/theme-one-dark`. Pyodide from jsdelivr CDN (pinned, no npm dep).

**Spec:** `docs/superpowers/specs/2026-06-16-leet-execution-design.md`.

**Conventions:** Next.js 16 App Router; `lib/` + `@/*` at root; dark/lowercase/no-emoji chrome; Tailwind theme tokens; client components need `"use client"`. Slice 2 gives: `getProblemBySlug`, `getTests(id,{includeHidden:false})`, `Problem` (has `judgingMode`,`functionName`,`starterCode`,`params`), `ProblemTest` (`{input,expected,kind}`).

---

## Task 1: Deps + CSP + judge types + compare (PURE, TDD)

**Files:** `package.json`, `next.config.ts`, `lib/judge/types.ts`, `lib/judge/compare.ts`, `lib/judge/compare.test.ts`

1. `bun add @uiw/react-codemirror @codemirror/lang-python @codemirror/lang-javascript @codemirror/theme-one-dark`
2. `next.config.ts` — update the CSP value: `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net`; add `worker-src 'self' blob:`; `connect-src 'self' https://cdn.jsdelivr.net`. Leave other directives. (`'unsafe-eval'` is required because the JS engine runs user code via `new Function`, and Pyodide needs WASM eval.)
3. `lib/judge/types.ts`:
```ts
export type Lang = "python" | "javascript";
export type JudgingMode = "function" | "stdio"; // re-export-compatible with lib/problems
export interface JudgeCase { input: string; expected: string; }
export interface RawCaseOutput { got: string | null; stdout: string; error: string | null; timeMs: number; }
export interface CaseResult { index: number; passed: boolean; expected: string; got: string | null; stdout: string; error: string | null; timeMs: number; }
export interface RunResult { results: CaseResult[]; passedCount: number; total: number; allPassed: boolean; fatal?: string; }
```
4. `lib/judge/compare.ts` (PURE):
```ts
export function normalizeStdout(s: string): string; // CRLF→LF, strip trailing spaces per line, trim trailing blank lines/newlines
export function deepEqualJson(a: unknown, b: unknown): boolean; // numbers: abs/rel tolerance 1e-9; arrays order-sensitive same length; objects key-order-insensitive same keys; primitives strict (with number tolerance)
export function compareCase(expected: string, raw: RawCaseOutput, mode: JudgingMode, index: number): CaseResult;
//  function mode: if raw.error → fail; parse expected+raw.got as JSON (got invalid → fail); passed = deepEqualJson.
//  stdio mode: if raw.error → fail; passed = normalizeStdout(raw.got ?? "") === normalizeStdout(expected).
```
5. `lib/judge/compare.test.ts` — cover: ints equal; float within tolerance equal, outside not; nested arrays; arrays order matters; objects key-order-insensitive; expected `[0,1]` vs got `"[0, 1]"` (whitespace in JSON) equal; got `null`/invalid JSON → fail; error present → fail; stdio trailing-newline/CRLF/trailing-space normalization equal; stdio genuinely different → fail.
6. `bun run test lib/judge/compare.test.ts` green; `bun run build` (CSP change compiles). Commit: `feat: judge types, pure comparison logic, CSP + codemirror deps`.

---

## Task 2: JavaScript engine (worker + runner)

**Files:** `workers/js-runner.worker.ts` (or inline Blob worker), `lib/judge/run-js.ts`

- Worker receives `{ id, code, mode, functionName, cases }`. For each case produce `RawCaseOutput`.
  - Sandbox: no `importScripts` of anything; user code via `new Function`. Capture stdout by overriding `console.log`/`console.error` (join args with spaces, newline per call) into a buffer per case.
  - **function mode:** evaluate `new Function(userCode + "; return typeof " + functionName + " !== 'undefined' ? " + functionName + " : undefined;")()` once to get the fn (re-evaluate per case is fine too but define-once is preferred); per case `const args = JSON.parse(input); const r = fn(...args); got = JSON.stringify(r);` Reset stdout buffer per case. On throw → `error = String(e && e.stack || e)`.
  - **stdio mode:** per case, provide `input` via a closure: expose `readline()` (returns next line, or "" when exhausted) and `read()` (whole remaining input). Run `new Function("readline","read","print", userCode)(readline, read, print)` where `print`/`console.log` write to stdout buffer. `got = stdout`.
  - Measure `timeMs` per case with `performance.now()`. Post `{ id, outputs }`.
- `lib/judge/run-js.ts` (client): `export async function runJs(args): Promise<RawCaseOutput[]>` — create the worker, postMessage, await the matching `id`, terminate on completion. Enforce a 5000ms total timeout: if exceeded, terminate the worker and synthesize `RawCaseOutput[]` with `error: "time limit exceeded"` for unfinished cases (or a fatal). Keep it simple: on timeout, return all cases errored with TLE.
- No unit test for the worker (browser/worker runtime); ensure `tsc`/`build`/`lint` pass. If using `new URL("./js-runner.worker.ts", import.meta.url)` doesn't bundle under Next 16/Turbopack, fall back to a Blob worker built from a string and document it in a comment.
- Commit: `feat: javascript execution engine (sandboxed worker)`.

---

## Task 3: Python engine (Pyodide worker + runner)

**Files:** `workers/python-runner.worker.ts` (or Blob worker), `lib/judge/run-python.ts`, `lib/judge/pyodide-version.ts` (pinned version constant)

- Pin Pyodide, e.g. `export const PYODIDE_VERSION = "0.26.4"; export const PYODIDE_INDEX_URL = \`https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/\`;`
- Worker: on first message, `importScripts(PYODIDE_INDEX_URL + "pyodide.js")` then `self.pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL })`. Cache it. If load fails → post `{ id, fatal: "failed to load python runtime" }`.
  - Capture stdout: use `pyodide.setStdout({ batched: (s) => buffer += s + "\n" })` (or the version-appropriate API) and similar for stderr; reset buffer per case.
  - **function mode:** `pyodide.runPython(userCode)` once to define the function; per case run a dispatcher:
    ```python
    import json
    __args = json.loads(__INPUT__)
    __res = functionName(*__args)
    json.dumps(__res)
    ```
    Pass `__INPUT__` safely (set via `pyodide.globals.set("__INPUT__", input)` then `json.loads(__INPUT__)`). `got` = the returned JSON string. Catch Python exceptions (runPython throws a JS error with the traceback) → `error`.
  - **stdio mode:** per case: `pyodide.globals.set("__STDIN__", input)`, run a wrapper that does `import sys, io; sys.stdin = io.StringIO(__STDIN__)` then execs the user code, capturing stdout. Reset stdin/stdout each case.
  - Per-case `timeMs`. Post `{ id, outputs }`.
- `lib/judge/run-python.ts` (client): `runPython(args): Promise<RawCaseOutput[] | { fatal: string }>` — reuse a module-level worker across calls (load Pyodide once). First-run timeout generous (e.g. 30s for download), subsequent 10s. On fatal, surface it.
- No unit test (WASM/worker runtime). Ensure build/lint/tsc pass. Document worker strategy choice.
- Commit: `feat: python execution engine (pyodide worker)`.

---

## Task 4: Dispatcher + CodeEditor

**Files:** `lib/judge/run.ts`, `components/practice/CodeEditor.tsx`

- `lib/judge/run.ts`:
```ts
import type { Lang, JudgingMode, JudgeCase, RunResult } from "./types";
export async function runProblem(args: { lang: Lang; code: string; mode: JudgingMode; functionName: string | null; cases: JudgeCase[]; }): Promise<RunResult>;
// dispatch to runJs/runPython → get RawCaseOutput[] (or fatal) → map via compareCase → assemble RunResult (passedCount,total,allPassed). On fatal, return RunResult with fatal set and empty results.
```
- `components/practice/CodeEditor.tsx` (`"use client"`): wrap `@uiw/react-codemirror` with the python or javascript extension based on a `lang` prop, `@codemirror/theme-one-dark`, controlled `value`/`onChange`. Props: `{ lang, value, onChange }`. Keep it a thin controlled wrapper.
- Ensure build/lint pass. Commit: `feat: run dispatcher + codemirror editor component`.

---

## Task 5: Practice surface on the problem page

**Files:** `components/practice/PracticePanel.tsx`, `app/problems/[slug]/page.tsx` (replace the disabled affordance)

- `PracticePanel.tsx` (`"use client"`) props: `{ slug, judgingMode, functionName, starterCode: Record<string,string>, cases: {input,expected}[] }`.
  - Language selector: options limited to langs present in `starterCode` (fallback to both python+js if empty). State: `lang`, `code` (seeded from `starterCode[lang]`; switching lang re-seeds if untouched, else keep — simplest: re-seed on lang change with a confirm-free reset, plus a "reset to starter" button).
  - `<CodeEditor lang={lang} value={code} onChange={setCode} />`.
  - "run" button → `setRunning(true)`, `const result = await runProblem({lang, code, mode: judgingMode, functionName, cases})`, render results. Disable while running; show "loading python…" hint on first python run.
  - Results UI: summary `passedCount/total passed`; per case: index, pass/fail, expected, got, stdout (collapsible), error (if any), timeMs. Lowercase chrome. If `result.fatal`, show it.
- `app/problems/[slug]/page.tsx`: remove the disabled "practice (coming soon)" button; render `<PracticePanel slug={problem.slug} judgingMode={problem.judgingMode} functionName={problem.functionName} starterCode={problem.starterCode} cases={visibleTests.map(t=>({input:t.input,expected:t.expected}))} />`. Keep the existing statement/examples/badges. (Examples can stay or be folded into the panel — keep statement + badges; the panel shows the cases.)
- Build/lint pass. Commit: `feat: in-browser practice panel wired into the problem page`.

---

## Task 6: Seed script + verification

**Files:** `scripts/seed.ts`, plus run full verification.

- `scripts/seed.ts`: idempotent (check slug, skip if exists). Insert published demo problems via the Slice 2 stores (`createProblem` + `replaceTests`):
  - `two-sum` — function mode, `functionName: "twoSum"`, params `[{name:"nums",type:"int[]"},{name:"target",type:"int"}]`, starterCode python `def twoSum(nums, target):\n    # your code\n    pass` and javascript `function twoSum(nums, target) {\n  // your code\n}`. Tests (function mode → input is JSON args array, expected is JSON value): visible `["[2,7,11,15]",? ]` — careful: `input` is a JSON array of the args, so `input = "[[2,7,11,15], 9]"`, `expected = "[0,1]"`; a second visible case; one hidden case.
  - `a-plus-b` — stdio mode, starter prints sum of two space-separated ints; visible tests: input `"2 3\n"` expected `"5\n"`, input `"10 20\n"` expected `"30\n"`.
  - Print what it created/skipped. Use `bun run scripts/seed.ts` (it imports `@/lib/...`; ensure tsconfig/bun can run it — it can `import { db, initDb }` and the stores; reads `.env.local` via bun's auto env loading, or instruct running with env).
- Run `bun run test` (compare tests + all prior), `bun run build`, `bun run lint` — all pass.
- Document the manual browser acceptance checklist in the commit body (load a seeded problem, run correct + wrong solutions in py + js, both modes).
- Commit: `feat: seed demo problems + slice 3 verification`.

---

## Self-Review (planning)
- Spec coverage: compare logic (T1), JS engine (T2), Python engine (T3), dispatcher+editor (T4), practice UI wired in (T5), seed+verify (T6), CSP+deps (T1). All mapped.
- The security/correctness comparison is pure + unit-tested (T1); engines return raw outputs only.
- Live WASM/worker execution can't be unit-tested in Node — explicitly deferred to a manual/automated browser smoke test, called out in T6.
- Worker bundling risk under Next 16 is flagged with a Blob-worker fallback in T2/T3.
