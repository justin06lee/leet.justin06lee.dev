import { requireOwner } from "@/lib/auth-server";
import { getPattern } from "@/lib/toolkit";
import ArticleForm from "@/components/admin/ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticle({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireOwner();

  const sp = await searchParams;
  const raw = Array.isArray(sp.pattern) ? sp.pattern[0] : sp.pattern;
  // Only honor a key that's actually in the syllabus, so a junk query string
  // can't preselect a pattern the Select has no option for.
  const defaultPattern = raw && getPattern(raw) ? raw : undefined;

  return <ArticleForm defaultPattern={defaultPattern} />;
}
