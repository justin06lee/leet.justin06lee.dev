import { Plus } from "lucide-react";
import { requireOwner } from "@/lib/auth-server";
import { listProblems, type Problem } from "@/lib/problems";
import { getPattern } from "@/lib/toolkit";
import { deleteProblemAction } from "@/app/admin/actions";
import DeleteButton from "@/components/admin/DeleteButton";
import { AdminTable, type AdminColumn } from "@/components/admin/AdminTable";
import { Button } from "@/components/chrome/button";
import { Badge } from "@/components/chrome/badge";
import { FadeIn } from "@/components/chrome/fade-in";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const columns: AdminColumn<Problem>[] = [
  {
    key: "title",
    header: "title",
    render: (p) => <span className="text-white">{p.title}</span>,
  },
  {
    key: "pattern",
    header: "pattern",
    hideOnMobile: true,
    render: (p) => (
      <span className="text-white/60">
        {p.pattern ? (getPattern(p.pattern)?.label ?? p.pattern) : "—"}
      </span>
    ),
  },
  {
    key: "difficulty",
    header: "difficulty",
    hideOnMobile: true,
    render: (p) => <Badge variant="outline">{p.difficulty}</Badge>,
  },
  {
    key: "mode",
    header: "mode",
    hideOnMobile: true,
    render: (p) => <Badge variant="outline">{p.judgingMode}</Badge>,
  },
  {
    key: "published",
    header: "status",
    render: (p) => (
      <Badge variant={p.published ? "solid" : "outline"}>
        {p.published ? "published" : "draft"}
      </Badge>
    ),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (p) => (
      <span className="flex items-center justify-end gap-2">
        <Button variant="link" size="sm" href={`/admin/problems/${p.id}/edit`}>
          edit
        </Button>
        <DeleteButton id={p.id} action={deleteProblemAction} />
      </span>
    ),
  },
];

export default async function AdminProblems() {
  await requireOwner();
  const problems = await listProblems({ includeUnpublished: true });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lowercase">
      <PageHeader
        eyebrow="admin"
        title="problems"
        subtitle={`${problems.length} total, drafts included.`}
        actions={
          <Button variant="solid" icon={Plus} href="/admin/problems/new">
            new problem
          </Button>
        }
      />
      <FadeIn delay={0.2} className="mt-8">
        <AdminTable
          columns={columns}
          rows={problems}
          getKey={(p) => p.id}
          empty="no problems yet."
        />
      </FadeIn>
    </div>
  );
}
