import Link from "next/link";
import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import { deleteArticleAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminArticles() {
  await requireOwner();

  const articles = await listArticles({ includeUnpublished: true });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 lowercase">
      <div className="flex items-center justify-between">
        <h1 className="text-lg text-foreground">articles</h1>
        <Link
          href="/admin/articles/new"
          className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          new article
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 font-normal">title</th>
            <th className="py-2 font-normal">pattern</th>
            <th className="py-2 font-normal">published</th>
            <th className="py-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {articles.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-muted">
                no articles yet.
              </td>
            </tr>
          )}
          {articles.map((a) => (
            <tr key={a.id} className="border-b border-border">
              <td className="py-2 text-foreground">{a.title}</td>
              <td className="py-2 text-muted">{a.pattern ?? "—"}</td>
              <td className="py-2 text-muted">{a.published ? "yes" : "no"}</td>
              <td className="flex items-center gap-3 py-2">
                <Link
                  href={`/admin/articles/${a.id}/edit`}
                  className="text-muted underline underline-offset-4 hover:text-foreground"
                >
                  edit
                </Link>
                <DeleteButton id={a.id} action={deleteArticleAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
