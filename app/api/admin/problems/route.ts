import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerApi } from "@/lib/auth-server";
import {
  createProblem,
  listProblems,
  isProblemValidationError,
  type Difficulty,
  type JudgingMode,
  type ProblemParam,
} from "@/lib/problems";

export const dynamic = "force-dynamic";

export interface ProblemBody {
  title?: string;
  statement?: string;
  pattern?: string | null;
  difficulty?: Difficulty;
  judgingMode?: JudgingMode;
  functionName?: string | null;
  params?: ProblemParam[];
  returnType?: string | null;
  starterCode?: Record<string, string>;
  slug?: string;
  published?: boolean;
}

// List every problem, published or not. Summary fields only — fetch one by id
// for the statement, starter code, and tests.
export async function GET() {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const problems = await listProblems({ includeUnpublished: true });
  return NextResponse.json(
    problems.map(
      ({ id, slug, title, pattern, difficulty, judgingMode, published, createdAt, updatedAt }) => ({
        id,
        slug,
        title,
        pattern,
        difficulty,
        judgingMode,
        published,
        createdAt,
        updatedAt,
      }),
    ),
  );
}

// Create. Mirrors saveProblemAction's create path (validation + revalidates).
export async function POST(req: NextRequest) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  let input: ProblemBody;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (input.judgingMode === "function" && !input.functionName?.trim()) {
    return NextResponse.json({ error: "function mode requires a function name" }, { status: 400 });
  }

  try {
    const problem = await createProblem({
      title,
      statement: input.statement ?? "",
      pattern: input.pattern ?? null,
      difficulty: input.difficulty,
      judgingMode: input.judgingMode,
      functionName: input.functionName ?? null,
      params: input.params ?? [],
      returnType: input.returnType ?? null,
      starterCode: input.starterCode ?? {},
      ...(input.slug ? { slug: input.slug } : {}),
      published: input.published ?? false,
    });

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
