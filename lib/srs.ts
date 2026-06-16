// Pure, deterministic spaced-repetition scheduler operating on integer day
// indices. Date <-> day conversion lives in lib/day.ts.

export interface SrsCore {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  lastGrade: number | null;
}

export interface SrsState extends SrsCore {
  dueDay: number;
}

export const DEFAULT_SRS: SrsCore = {
  ease: 2.5,
  intervalDays: 0,
  reps: 0,
  lapses: 0,
  lastGrade: null,
};

export type Grade = 0 | 1 | 2 | 3 | 4;

const clamp = (e: number) => Math.min(3.0, Math.max(1.3, e));

export function schedule(prev: SrsCore, grade: Grade, todayDay: number): SrsState {
  let ease: number;
  let intervalDays: number;
  let reps: number;
  let lapses: number;

  if (grade === 0) {
    reps = 0;
    lapses = prev.lapses + 1;
    ease = clamp(prev.ease - 0.2);
    intervalDays = 1;
  } else {
    ease = clamp(prev.ease + (0.1 - (4 - grade) * 0.08));
    reps = prev.reps + 1;
    intervalDays =
      reps === 1 ? 1 : reps === 2 ? 6 : Math.round(prev.intervalDays * ease);
    if (grade === 1) {
      intervalDays = Math.max(
        1,
        Math.round((reps <= 2 ? intervalDays : prev.intervalDays) * 1.2),
      );
    }
    lapses = prev.lapses;
  }

  return {
    ease,
    intervalDays,
    reps,
    lapses,
    lastGrade: grade,
    dueDay: todayDay + intervalDays,
  };
}
