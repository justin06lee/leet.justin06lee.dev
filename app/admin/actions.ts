"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth-server";
import { createArticle, updateArticle, deleteArticle } from "@/lib/articles";
import {
  createProblem,
  updateProblem,
  deleteProblem,
  replaceTests,
  type ProblemParam,
  type ProblemTest,
  type Difficulty,
  type JudgingMode,
} from "@/lib/problems";

export interface ArticleInput {
  id?: string;
  title: string;
  body: string;
  pattern?: string | null;
  slug?: string;
  published?: boolean;
}

export async function saveArticleAction(
  input: ArticleInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireOwner();

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "title is required" };

  try {
    const article = input.id
      ? await updateArticle(input.id, {
          title,
          body: input.body,
          pattern: input.pattern ?? null,
          ...(input.slug ? { slug: input.slug } : {}),
          published: input.published ?? false,
        })
      : await createArticle({
          title,
          body: input.body,
          pattern: input.pattern ?? null,
          slug: input.slug,
          published: input.published ?? false,
        });

    revalidatePath("/articles");
    revalidatePath("/admin/articles");
    revalidatePath("/toolkit");
    if (article.slug) revalidatePath(`/articles/${article.slug}`);

    return { ok: true, slug: article.slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed to save article" };
  }
}

export async function deleteArticleAction(id: string): Promise<{ ok: boolean }> {
  await requireOwner();
  await deleteArticle(id);
  revalidatePath("/articles");
  revalidatePath("/admin/articles");
  revalidatePath("/toolkit");
  return { ok: true };
}

export interface ProblemInput {
  id?: string;
  title: string;
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

export async function saveProblemAction(
  input: ProblemInput,
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  await requireOwner();

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "title is required" };
  if (input.judgingMode === "function" && !input.functionName?.trim()) {
    return { ok: false, error: "function mode requires a function name" };
  }

  try {
    const problem = input.id
      ? await updateProblem(input.id, {
          title,
          statement: input.statement ?? "",
          pattern: input.pattern ?? null,
          ...(input.difficulty ? { difficulty: input.difficulty } : {}),
          ...(input.judgingMode ? { judgingMode: input.judgingMode } : {}),
          functionName: input.functionName ?? null,
          params: input.params ?? [],
          returnType: input.returnType ?? null,
          starterCode: input.starterCode ?? {},
          ...(input.slug ? { slug: input.slug } : {}),
          published: input.published ?? false,
        })
      : await createProblem({
          title,
          statement: input.statement ?? "",
          pattern: input.pattern ?? null,
          difficulty: input.difficulty,
          judgingMode: input.judgingMode,
          functionName: input.functionName ?? null,
          params: input.params ?? [],
          returnType: input.returnType ?? null,
          starterCode: input.starterCode ?? {},
          slug: input.slug,
          published: input.published ?? false,
        });

    revalidatePath("/problems");
    revalidatePath("/admin/problems");
    revalidatePath("/toolkit");
    if (problem.slug) revalidatePath(`/problems/${problem.slug}`);

    return { ok: true, id: problem.id, slug: problem.slug };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed to save problem" };
  }
}

export async function deleteProblemAction(id: string): Promise<{ ok: boolean }> {
  await requireOwner();
  await deleteProblem(id);
  revalidatePath("/problems");
  revalidatePath("/admin/problems");
  revalidatePath("/toolkit");
  return { ok: true };
}

export async function saveProblemTestsAction(
  problemId: string,
  tests: Array<Pick<ProblemTest, "kind" | "input" | "expected">>,
): Promise<{ ok: boolean }> {
  await requireOwner();
  await replaceTests(
    problemId,
    tests.map((t, ordinal) => ({ ordinal, kind: t.kind, input: t.input, expected: t.expected })),
  );
  revalidatePath("/problems");
  revalidatePath("/admin/problems");
  return { ok: true };
}
