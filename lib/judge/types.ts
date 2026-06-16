export type Lang = "python" | "javascript";
export type JudgingMode = "function" | "stdio";
export interface JudgeCase {
  input: string;
  expected: string;
}
export interface RawCaseOutput {
  got: string | null;
  stdout: string;
  error: string | null;
  timeMs: number;
}
export interface CaseResult {
  index: number;
  passed: boolean;
  expected: string;
  got: string | null;
  stdout: string;
  error: string | null;
  timeMs: number;
}
export interface RunResult {
  results: CaseResult[];
  passedCount: number;
  total: number;
  allPassed: boolean;
  fatal?: string;
}
