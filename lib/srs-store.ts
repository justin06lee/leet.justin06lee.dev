import { randomUUID } from "crypto";
import { db, initDb } from "./db";
import { dayToISO, isoToDay } from "./day";
import { DEFAULT_SRS, schedule, type Grade, type SrsCore, type SrsState } from "./srs";

export async function getSrsState(
  userId: string,
  problemId: string,
): Promise<SrsState | null> {
  await initDb();
  const res = await db.execute({
    sql: `SELECT ease, interval_days, due_at, reps, lapses, last_grade
          FROM srs_state WHERE user_id = ? AND problem_id = ?`,
    args: [userId, problemId],
  });
  const row = res.rows[0];
  if (!row) return null;

  const dueAt = row.due_at as string | null;
  return {
    ease: row.ease as number,
    intervalDays: row.interval_days as number,
    reps: row.reps as number,
    lapses: row.lapses as number,
    lastGrade: row.last_grade as number | null,
    dueDay: dueAt ? isoToDay(dueAt) : 0,
  };
}

export async function recordReview(
  userId: string,
  problemId: string,
  grade: Grade,
  todayDay: number,
): Promise<SrsState> {
  await initDb();

  const existing = await getSrsState(userId, problemId);
  const core: SrsCore = existing
    ? {
        ease: existing.ease,
        intervalDays: existing.intervalDays,
        reps: existing.reps,
        lapses: existing.lapses,
        lastGrade: existing.lastGrade,
      }
    : DEFAULT_SRS;

  const next = schedule(core, grade, todayDay);
  const dueIso = dayToISO(next.dueDay);

  await db.batch([
    {
      sql: `INSERT INTO srs_state
              (user_id, problem_id, ease, interval_days, due_at, reps, lapses, last_grade, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(user_id, problem_id) DO UPDATE SET
              ease = excluded.ease,
              interval_days = excluded.interval_days,
              due_at = excluded.due_at,
              reps = excluded.reps,
              lapses = excluded.lapses,
              last_grade = excluded.last_grade,
              updated_at = datetime('now')`,
      args: [
        userId,
        problemId,
        next.ease,
        next.intervalDays,
        dueIso,
        next.reps,
        next.lapses,
        next.lastGrade,
      ],
    },
    {
      sql: `INSERT INTO reviews (id, user_id, problem_id, grade, reviewed_on, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [randomUUID(), userId, problemId, grade, dayToISO(todayDay)],
    },
  ]);

  return next;
}

export async function getDueProblemIds(
  userId: string,
  todayDay: number,
): Promise<string[]> {
  await initDb();
  const res = await db.execute({
    sql: `SELECT problem_id FROM srs_state
          WHERE user_id = ? AND due_at IS NOT NULL AND due_at <= ?`,
    args: [userId, dayToISO(todayDay)],
  });
  return res.rows.map((r) => r.problem_id as string);
}
