"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-server";
import { recordReview } from "@/lib/srs-store";
import { getProblemById } from "@/lib/problems";
import { epochDay, dayToISO } from "@/lib/day";
import type { Grade } from "@/lib/srs";

export async function recordReviewAction(
  problemId: string,
  grade: number,
): Promise<{ ok: true; dueAtISO: string } | { ok: false; error: string }> {
  const user = await requireUser();

  if (!Number.isInteger(grade) || grade < 0 || grade > 4) {
    return { ok: false, error: "invalid grade" };
  }

  const problem = await getProblemById(problemId);
  if (!problem || !problem.published) {
    return { ok: false, error: "problem not found" };
  }

  const next = await recordReview(user.id, problemId, grade as Grade, epochDay());

  revalidatePath("/dashboard");
  revalidatePath("/session");
  revalidatePath("/mastery");

  return { ok: true, dueAtISO: dayToISO(next.dueDay) };
}
