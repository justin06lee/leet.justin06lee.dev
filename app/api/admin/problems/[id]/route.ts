import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerApi } from "@/lib/auth-server";
import {
  getProblemById,
  getTests,
  updateProblem,
  deleteProblem,
  isProblemValidationError,
} from "@/lib/problems";
import type { ProblemBody } from "../route";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Full problem, tests included — hidden ones too (this surface is owner-only).
export async function GET(_req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const problem = await getProblemById(id);
  if (!problem) return NextResponse.json({ error: "problem not found" }, { status: 404 });

  const tests = await getTests(id, { includeHidden: true });
  return NextResponse.json({ ...problem, tests });
}

// Partial update: only the provided fields change, merged over the current row
// through updateProblem (which validates the merged difficulty/judgingMode/
// functionName). Same revalidates as saveProblemAction.
export async function PATCH(req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const existing = await getProblemById(id);
  if (!existing) return NextResponse.json({ error: "problem not found" }, { status: 404 });

  let input: ProblemBody;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateProblem>[1] = {};
  if ("title" in input) {
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    patch.title = title;
  }
  if ("statement" in input) patch.statement = input.statement ?? "";
  if ("pattern" in input) patch.pattern = input.pattern ?? null;
  if ("difficulty" in input && input.difficulty !== undefined) patch.difficulty = input.difficulty;
  if ("judgingMode" in input && input.judgingMode !== undefined) {
    patch.judgingMode = input.judgingMode;
  }
  if ("functionName" in input) patch.functionName = input.functionName ?? null;
  if ("params" in input) patch.params = input.params ?? [];
  if ("returnType" in input) patch.returnType = input.returnType ?? null;
  if ("starterCode" in input) patch.starterCode = input.starterCode ?? {};
  if ("slug" in input && input.slug) patch.slug = input.slug;
  if ("published" in input) patch.published = input.published ?? false;

  try {
    const problem = await updateProblem(id, patch);

    revalidatePath("/problems");
    revalidatePath("/admin/problems");
    revalidatePath("/toolkit");
    if (problem.slug) revalidatePath(`/problems/${problem.slug}`);

    return NextResponse.json({ ok: true, id: problem.id, slug: problem.slug });
  } catch (e) {
    if (isProblemValidationError(e)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

// Mirrors deleteProblemAction (deleteProblem cascades problem_tests), plus a
// read-first so a bad id is a 404 rather than a blind {ok:true}.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const existing = await getProblemById(id);
  if (!existing) return NextResponse.json({ error: "problem not found" }, { status: 404 });

  await deleteProblem(id);
  revalidatePath("/problems");
  revalidatePath("/admin/problems");
  revalidatePath("/toolkit");
  return NextResponse.json({ ok: true });
}
