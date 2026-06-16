import { requireOwner } from "@/lib/auth-server";
import ProblemForm from "@/components/admin/ProblemForm";

export const dynamic = "force-dynamic";

export default async function NewProblem() {
  await requireOwner();

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-foreground">new problem</h1>
      <ProblemForm />
    </section>
  );
}
