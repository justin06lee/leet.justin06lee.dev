import Link from "next/link";
import { requireOwner } from "@/lib/auth-server";
import { listProblems } from "@/lib/problems";
import { deleteProblemAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminProblems() {
  await requireOwner();

  const problems = await listProblems({ includeUnpublished: true });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 lowercase">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-foreground">problems</h1>
        <Link
          href="/admin/problems/new"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          new problem
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 font-normal">title</th>
            <th className="py-2 font-normal">pattern</th>
            <th className="py-2 font-normal">difficulty</th>
            <th className="py-2 font-normal">mode</th>
            <th className="py-2 font-normal">published</th>
            <th className="py-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {problems.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-muted">
                no problems yet.
              </td>
            </tr>
          )}
          {problems.map((p) => (
            <tr key={p.id} className="border-b border-border">
              <td className="py-2 text-foreground">{p.title}</td>
              <td className="py-2 text-muted">{p.pattern ?? "—"}</td>
              <td className="py-2 text-muted">{p.difficulty}</td>
              <td className="py-2 text-muted">{p.judgingMode}</td>
              <td className="py-2 text-muted">{p.published ? "yes" : "no"}</td>
              <td className="flex items-center gap-3 py-2">
                <Link
                  href={`/admin/problems/${p.id}/edit`}
                  className="text-muted underline underline-offset-4 hover:text-foreground"
                >
                  edit
                </Link>
                <DeleteButton id={p.id} action={deleteProblemAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
