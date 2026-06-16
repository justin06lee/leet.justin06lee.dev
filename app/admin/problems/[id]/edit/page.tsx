import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth-server";
import { listProblems, getTests } from "@/lib/problems";
import ProblemForm from "@/components/admin/ProblemForm";

export const dynamic = "force-dynamic";

export default async function EditProblem({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const problems = await listProblems({ includeUnpublished: true });
  const problem = problems.find((p) => p.id === id);
  if (!problem) notFound();

  const tests = await getTests(id, { includeHidden: true });

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-foreground">edit problem</h1>
      <ProblemForm initial={problem} initialTests={tests} />
    </section>
  );
}
