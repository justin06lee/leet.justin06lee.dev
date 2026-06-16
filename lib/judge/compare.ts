import type { CaseResult, JudgingMode, RawCaseOutput } from "./types";

/**
 * Normalize stdout for stdio-mode comparison:
 * - CRLF -> LF
 * - strip trailing spaces/tabs from each line
 * - remove trailing blank lines and trailing newline(s)
 */
export function normalizeStdout(s: string): string {
  const lf = s.replace(/\r\n/g, "\n");
  const trimmed = lf
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""));
  // Remove trailing blank lines (which also removes trailing newlines).
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === "") {
    trimmed.pop();
  }
  return trimmed.join("\n");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    (Object.getPrototypeOf(v) === Object.prototype ||
      Object.getPrototypeOf(v) === null)
  );
}

/**
 * Structural equality of parsed JSON values.
 * - Numbers: equal if a===b or within relative+absolute tolerance.
 * - Arrays: same length, element-wise, ORDER-SENSITIVE.
 * - Plain objects: same key set, key-order-INSENSITIVE, recursive values.
 * - Strings/booleans/null: strict equal.
 * - Mismatched types: false.
 */
export function deepEqualJson(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true;
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualJson(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) || isPlainObject(b)) {
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqualJson(a[key], b[key])) return false;
    }
    return true;
  }

  // Strings, booleans, null, and any remaining types: strict equality.
  return a === b;
}

/**
 * Build a CaseResult by comparing a raw worker output against the expected
 * value under the given judging mode.
 */
export function compareCase(
  expected: string,
  raw: RawCaseOutput,
  mode: JudgingMode,
  index: number,
): CaseResult {
  const base = {
    index,
    expected,
    got: raw.got,
    stdout: raw.stdout,
    error: raw.error,
    timeMs: raw.timeMs,
  };

  // Execution error short-circuits to fail.
  if (raw.error !== null && raw.error !== "") {
    return { ...base, passed: false };
  }

  let passed: boolean;
  if (mode === "function") {
    if (raw.got === null) {
      passed = false;
    } else {
      try {
        const parsedExpected = JSON.parse(expected);
        const parsedGot = JSON.parse(raw.got);
        passed = deepEqualJson(parsedGot, parsedExpected);
      } catch {
        passed = false;
      }
    }
  } else {
    passed = normalizeStdout(raw.got ?? "") === normalizeStdout(expected);
  }

  return { ...base, passed };
}
