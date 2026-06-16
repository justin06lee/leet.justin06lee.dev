// Python in-browser execution engine — WORKER SOURCE (Pyodide / WASM).
//
// Worker strategy: BLOB WORKER (mirrors workers/js-runner.worker.ts — see that
// file for the full rationale). In Next 16 / Turbopack the
// `new Worker(new URL("./x.worker.ts", import.meta.url))` pattern is fragile, so
// we ship the worker body as a *string* (`WORKER_SOURCE`), wrap it in a Blob, and
// `URL.createObjectURL` it in `lib/judge/run-python.ts`.
//
// Unlike the JS engine this worker DOES use `importScripts` (to load Pyodide from
// the jsdelivr CDN — CSP already allows it). Pyodide (the WASM runtime) is loaded
// LAZILY on the first message and CACHED on `self.pyodideReady`; every later
// message reuses the same interpreter instance.
//
// The string must be valid *plain* JavaScript (no TS syntax, no imports) — it runs
// in a Blob worker with no module/loader context.

/**
 * Inbound message shape (documented for readers; not enforced inside the string):
 *   { id: number, mode: "function" | "stdio",
 *     functionName: string | null, code: string,
 *     cases: { input: string, expected: string }[],
 *     indexURL: string }
 * Outbound (success): { id: number, outputs: RawCaseOutput[] }
 * Outbound (runtime load failure): { id: number, fatal: string }
 * where RawCaseOutput = { got: string|null, stdout: string, error: string|null, timeMs: number }
 *
 * The worker IGNORES `expected` — pass/fail comparison happens on the main thread.
 *
 * SAFETY: user `code` and per-case `input` are NEVER string-concatenated into the
 * Python source. They are passed to Python via `pyodide.globals.set(...)` and the
 * static Python snippets read them back from those globals.
 */
export const WORKER_SOURCE = String.raw`
"use strict";

// stdout/stderr capture buffer. Pyodide's setStdout/setStderr "batched" callback
// receives already-decoded string chunks; we append them as-is. Reset before each
// case via resetBuffer().
var __buffer = "";
function resetBuffer() { __buffer = ""; }

// ---- Python snippets (static — no user data interpolated) -------------------

// function mode: read JSON args from __INPUT__, call the user function, JSON-dump
// the result into __out. The function itself was defined by an earlier runPython.
var PY_FUNCTION_CALL =
  "import json as __json\n" +
  "__args = __json.loads(__INPUT__)\n" +
  "__res = __FN__(*__args)\n" +
  "__out = __json.dumps(__res)\n";

// stdio mode: wire up stdin from __STDIN__, then exec the user program (read from
// __USER_CODE__) in a fresh namespace so each case starts clean.
var PY_STDIO_RUN =
  "import sys as __sys, io as __io\n" +
  "__sys.stdin = __io.StringIO(__STDIN__)\n" +
  "exec(compile(__USER_CODE__, \"<solution>\", \"exec\"), {\"__name__\": \"__main__\"})\n";

function ensurePyodide(indexURL) {
  if (self.pyodideReady) return self.pyodideReady;
  self.pyodideReady = (function () {
    importScripts(indexURL + "pyodide.js");
    return loadPyodide({ indexURL: indexURL });
  })();
  return self.pyodideReady;
}

function attachStreams(pyodide) {
  pyodide.setStdout({ batched: function (s) { __buffer += s; } });
  pyodide.setStderr({ batched: function (s) { __buffer += s; } });
}

function runFunctionMode(pyodide, functionName, code, cases) {
  var outputs = [];

  // Define the user function ONCE. If this raises, every case errors with it.
  var defineError = null;
  try {
    pyodide.runPython(code);
  } catch (e) {
    defineError = String((e && e.message) || e);
  }

  // Bind the call snippet to the requested function name (static rewrite — the
  // name comes from problem config, not user-typed code, but we still avoid
  // concatenating user *code*; only the configured identifier is substituted).
  var callSrc = PY_FUNCTION_CALL.replace("__FN__", String(functionName));

  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    resetBuffer();
    var start = performance.now();
    var got = null;
    var error = null;

    if (defineError !== null) {
      error = defineError;
      outputs.push({ got: null, stdout: __buffer, error: error, timeMs: performance.now() - start });
      continue;
    }

    try {
      pyodide.globals.set("__INPUT__", c.input == null ? "" : String(c.input));
      pyodide.runPython(callSrc);
      got = pyodide.globals.get("__out");
      if (got == null) got = null; else got = String(got);
    } catch (e) {
      error = String((e && e.message) || e);
      got = null;
    } finally {
      try { pyodide.globals.set("__INPUT__", undefined); } catch (e2) {}
    }

    outputs.push({ got: got, stdout: __buffer, error: error, timeMs: performance.now() - start });
  }
  return outputs;
}

function runStdioMode(pyodide, code, cases) {
  var outputs = [];

  // The user program source is passed via a global; the static wrapper execs it
  // in a fresh namespace per case.
  pyodide.globals.set("__USER_CODE__", String(code || ""));

  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    resetBuffer();
    var start = performance.now();
    var error = null;

    try {
      pyodide.globals.set("__STDIN__", c.input == null ? "" : String(c.input));
      pyodide.runPython(PY_STDIO_RUN);
    } catch (e) {
      error = String((e && e.message) || e);
    } finally {
      try { pyodide.globals.set("__STDIN__", undefined); } catch (e2) {}
    }

    outputs.push({
      got: error === null ? __buffer : null,
      stdout: __buffer,
      error: error,
      timeMs: performance.now() - start,
    });
  }

  try { pyodide.globals.set("__USER_CODE__", undefined); } catch (e3) {}
  return outputs;
}

self.onmessage = function (ev) {
  var msg = ev.data || {};
  var id = msg.id;

  var ready;
  try {
    ready = ensurePyodide(msg.indexURL);
  } catch (e) {
    self.pyodideReady = undefined; // allow retry on a later message
    self.postMessage({ id: id, fatal: "failed to load python runtime" });
    return;
  }

  ready.then(function (pyodide) {
    attachStreams(pyodide);
    var outputs;
    if (msg.mode === "stdio") {
      outputs = runStdioMode(pyodide, String(msg.code || ""), msg.cases || []);
    } else {
      outputs = runFunctionMode(pyodide, msg.functionName, String(msg.code || ""), msg.cases || []);
    }
    self.postMessage({ id: id, outputs: outputs });
  }).catch(function () {
    self.pyodideReady = undefined; // load failed — allow retry on a later message
    self.postMessage({ id: id, fatal: "failed to load python runtime" });
  });
};
`;
