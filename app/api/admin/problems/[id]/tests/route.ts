import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwnerApi } from "@/lib/auth-server";
import { getProblemById, replaceTests, isTestKind } from "@/lib/problems";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Full replace, mirroring saveProblemTestsAction: delete-then-reinsert with
// the ordinal taken from the array index.
export async function PUT(req: NextRequest, { params }: Params) {
  const gate = await requireOwnerApi();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const problem = await getProblemById(id);
  if (!problem) return NextResponse.json({ error: "problem not found" }, { status: 404 });

  let body: { tests?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tests = body.tests;
  if (!Array.isArray(tests)) {
    return NextResponse.json({ error: "tests must be an array" }, { status: 400 });
  }
  for (const t of tests) {
    if (!t || typeof t !== "object" || !isTestKind((t as { kind?: unknown }).kind)) {
      return NextResponse.json(
        { error: 'each test needs a kind of "visible" or "hidden"' },
        { status: 400 },
      );
    }
  }

  await replaceTests(
    id,
    (tests as Array<{ kind: "visible" | "hidden"; input?: unknown; expected?: unknown }>).map(
      (t, ordinal) => ({
        ordinal,
        kind: t.kind,
        input: typeof t.input === "string" ? t.input : "",
        expected: typeof t.expected === "string" ? t.expected : "",
      }),
    ),
  );

  revalidatePath("/problems");
  revalidatePath("/admin/problems");
  return NextResponse.json({ ok: true });
}
