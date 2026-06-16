import Link from "next/link";
import { requireOwner } from "@/lib/auth-server";
import { listArticles } from "@/lib/articles";
import { listProblems } from "@/lib/problems";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireOwner();

  const [problems, articles] = await Promise.all([
    listProblems({ includeUnpublished: true }),
    listArticles({ includeUnpublished: true }),
  ]);

  const problemsPublished = problems.filter((p) => p.published).length;
  const problemsDraft = problems.length - problemsPublished;
  const articlesPublished = articles.filter((a) => a.published).length;
  const articlesDraft = articles.length - articlesPublished;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-24 lowercase">
      <h1 className="text-lg text-foreground">admin</h1>

      <Link
        href="/admin/problems"
        className="rounded border border-border bg-surface p-6 hover:border-foreground"
      >
        <p className="text-foreground">problems</p>
        <p className="text-sm text-muted">
          {problemsPublished} published · {problemsDraft} draft
        </p>
      </Link>

      <Link
        href="/admin/articles"
        className="rounded border border-border bg-surface p-6 hover:border-foreground"
      >
        <p className="text-foreground">articles</p>
        <p className="text-sm text-muted">
          {articlesPublished} published · {articlesDraft} draft
        </p>
      </Link>
    </section>
  );
}
