import { requireOwner } from "@/lib/auth-server";
import { listProblems } from "@/lib/problems";
import { deleteProblemAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";

export const dynamic = "force-dynamic";

export default async function AdminProblems() {
  await requireOwner();

  const problems = await listProblems({ includeUnpublished: true });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 lowercase">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-white">problems</h1>
        <Button variant="link" size="sm" href="/admin/problems/new">
          new problem
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/60">
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
              <td colSpan={6} className="py-4 text-white/60">
                no problems yet.
              </td>
            </tr>
          )}
          {problems.map((p) => (
            <tr key={p.id} className="border-b border-white/10">
              <td className="py-2 text-white">{p.title}</td>
              <td className="py-2 text-white/60">{p.pattern ?? "—"}</td>
              <td className="py-2">
                <Badge variant="outline">{p.difficulty}</Badge>
              </td>
              <td className="py-2">
                <Badge variant="outline">{p.judgingMode}</Badge>
              </td>
              <td className="py-2">
                <Badge variant={p.published ? "solid" : "outline"}>
                  {p.published ? "published" : "draft"}
                </Badge>
              </td>
              <td className="flex items-center gap-2 py-2">
                <Button variant="link" size="sm" href={`/admin/problems/${p.id}/edit`}>
                  edit
                </Button>
                <DeleteButton id={p.id} action={deleteProblemAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
