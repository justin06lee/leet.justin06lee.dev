// JavaScript in-browser execution engine — WORKER SOURCE.
//
// Worker strategy: BLOB WORKER.
// In Next 16 / Turbopack the `new Worker(new URL("./x.worker.ts", import.meta.url))`
// pattern is fragile (and would require Turbopack to transpile TS to a worker chunk).
// To keep bundling deterministic we instead ship the worker body as a *string*
// (`WORKER_SOURCE` below), wrap it in a Blob, and `URL.createObjectURL` it in
// `lib/judge/run-js.ts`. CSP already allows `worker-src 'self' blob:` and
// `script-src ... 'unsafe-eval'` (user code runs via `new Function`).
//
// This file therefore exports plain JS source text rather than running at import
// time. It is authored as a template string so it can still be reviewed/diffed as
// code. It must be valid *plain* JavaScript (no TS syntax, no imports) because it
// executes in a worker created from a Blob with no module/loader context.

/**
 * Inbound message shape (documented for readers; not enforced inside the string):
 *   { id: number, mode: "function" | "stdio",
 *     functionName: string | null, code: string,
 *     cases: { input: string, expected: string }[] }
 * Outbound: { id: number, outputs: RawCaseOutput[] }
 * where RawCaseOutput = { got: string|null, stdout: string, error: string|null, timeMs: number }
 *
 * The worker IGNORES `expected` — pass/fail comparison happens on the main thread.
 */
export const WORKER_SOURCE = String.raw`
"use strict";

var BT = String.fromCharCode(96); // backtick, for error messages

// Sandbox hardening: deny network + dynamic script loading to user code.
try { self.fetch = function () { throw new Error("network access is disabled"); }; } catch (e) {}
try { self.XMLHttpRequest = undefined; } catch (e) {}
try { self.WebSocket = undefined; } catch (e) {}
try { self.importScripts = function () { throw new Error("importScripts is disabled"); }; } catch (e) {}

// JSON-ish stringify for console output: objects -> JSON, primitives -> String().
function consoleStringify(v) {
  if (v === null) return "null";
  var t = typeof v;
  if (t === "string") return v;
  if (t === "number" || t === "boolean" || t === "bigint" || t === "undefined" || t === "symbol" || t === "function") {
    return String(v);
  }
  // objects / arrays
  try {
    return JSON.stringify(v);
  } catch (e) {
    return String(v);
  }
}

function makeWriter(getBuffer, push) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    push(args.map(consoleStringify).join(" ") + "\n");
  };
}

function runFunctionMode(functionName, code, cases) {
  var outputs = [];
  var fn;
  var compileError = null;
  try {
    fn = new Function(
      code + "\n; return typeof " + functionName + " !== 'undefined' ? " + functionName + " : undefined;"
    )();
  } catch (e) {
    compileError = String((e && e.stack) || e);
  }

  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var stdout = "";
    var push = (function () { return function (s) { stdout += s; }; })();
    var writer = makeWriter(function () { return stdout; }, push);
    var fakeConsole = { log: writer, error: writer, info: writer, warn: writer, debug: writer };

    var start = performance.now();
    var got = null;
    var error = null;

    if (compileError !== null || typeof fn !== "function") {
      error = compileError !== null
        ? compileError
        : "function " + BT + functionName + BT + " not defined";
      outputs.push({ got: null, stdout: "", error: error, timeMs: performance.now() - start });
      continue;
    }

    var savedConsole = self.console;
    self.console = fakeConsole;
    try {
      var args = JSON.parse(c.input);
      if (!Array.isArray(args)) args = [args];
      var r = fn.apply(null, args);
      got = JSON.stringify(r === undefined ? null : r);
    } catch (e) {
      error = String((e && e.stack) || e);
      got = null;
    } finally {
      self.console = savedConsole;
    }
    outputs.push({ got: got, stdout: stdout, error: error, timeMs: performance.now() - start });
  }
  return outputs;
}

function runStdioMode(code, cases) {
  var outputs = [];
  for (var i = 0; i < cases.length; i++) {
    var c = cases[i];
    var stdout = "";
    var push = function (s) { stdout += s; };

    // Fresh stdin cursor per case.
    var input = c.input == null ? "" : String(c.input);
    var lines = input.length === 0 ? [] : input.split("\n");
    // A trailing newline produces a trailing empty element; drop it so readline
    // does not yield a spurious empty final line.
    if (lines.length > 0 && lines[lines.length - 1] === "" && input.charAt(input.length - 1) === "\n") {
      lines.pop();
    }
    var lineIdx = 0;
    var charPos = 0; // for read(): consumed offset into input

    var readline = function () {
      if (lineIdx >= lines.length) return null;
      var line = lines[lineIdx++];
      charPos += line.length + 1;
      return line;
    };
    var read = function () {
      var rest = input.slice(charPos);
      charPos = input.length;
      lineIdx = lines.length;
      return rest;
    };
    var print = makeWriter(function () { return stdout; }, push);
    var fakeConsole = { log: print, error: print, info: print, warn: print, debug: print };

    var start = performance.now();
    var error = null;
    try {
      new Function("readline", "read", "print", "console", code)(readline, read, print, fakeConsole);
    } catch (e) {
      error = String((e && e.stack) || e);
    }
    outputs.push({
      got: error === null ? stdout : null,
      stdout: stdout,
      error: error,
      timeMs: performance.now() - start,
    });
  }
  return outputs;
}

self.onmessage = function (ev) {
  var msg = ev.data || {};
  var id = msg.id;
  var outputs;
  try {
    if (msg.mode === "stdio") {
      outputs = runStdioMode(String(msg.code || ""), msg.cases || []);
    } else {
      outputs = runFunctionMode(msg.functionName, String(msg.code || ""), msg.cases || []);
    }
  } catch (e) {
    // Fatal — surface as a per-case error so the main thread still gets a result.
    var fatal = String((e && e.stack) || e);
    outputs = (msg.cases || []).map(function () {
      return { got: null, stdout: "", error: fatal, timeMs: 0 };
    });
  }
  self.postMessage({ id: id, outputs: outputs });
};
`;
