import { describe, it, expect } from "vitest";
import { initDb } from "./db";
import {
  createArticle,
  updateArticle,
  getArticleBySlug,
  listArticles,
  deleteArticle,
} from "./articles";

describe("createArticle / getArticleBySlug", () => {
  it("creates an article and reads it back by slug, unpublished by default", async () => {
    await initDb();
    const created = await createArticle({ title: "Two Pointers", body: "lesson body" });
    expect(created.slug).toBe("two-pointers");
    expect(created.published).toBe(false);
    expect(typeof created.id).toBe("string");

    const fetched = await getArticleBySlug("two-pointers", { includeUnpublished: true });
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe("Two Pointers");
    expect(fetched!.body).toBe("lesson body");
  });

  it("hides unpublished articles from getArticleBySlug and listArticles unless includeUnpublished", async () => {
    await initDb();
    await createArticle({ title: "Hidden Lesson", body: "x" });

    expect(await getArticleBySlug("hidden-lesson")).toBeNull();
    const visibleList = await listArticles();
    expect(visibleList.some((a) => a.slug === "hidden-lesson")).toBe(false);

    expect(await getArticleBySlug("hidden-lesson", { includeUnpublished: true })).not.toBeNull();
    const allList = await listArticles({ includeUnpublished: true });
    expect(allList.some((a) => a.slug === "hidden-lesson")).toBe(true);
  });

  it("dedupes slugs for articles with the same title", async () => {
    await initDb();
    const a = await createArticle({ title: "Dup", body: "1" });
    const b = await createArticle({ title: "Dup", body: "2" });
    expect(a.slug).toBe("dup");
    expect(b.slug).toBe("dup-2");
  });
});

describe("updateArticle", () => {
  it("updates title, body and published; published article becomes visible", async () => {
    await initDb();
    const created = await createArticle({ title: "Sliding Window", body: "draft" });
    const updated = await updateArticle(created.id, {
      title: "Sliding Window Patterns",
      body: "final",
      published: true,
    });
    expect(updated.title).toBe("Sliding Window Patterns");
    expect(updated.body).toBe("final");
    expect(updated.published).toBe(true);

    const list = await listArticles();
    expect(list.some((x) => x.id === created.id)).toBe(true);
  });

  it("re-slugs and dedupes excluding the current article on slug change", async () => {
    await initDb();
    await createArticle({ title: "Graphs", body: "a" });
    const target = await createArticle({ title: "Graphs Extra", body: "b" });
    // change target slug to clash with existing "graphs"
    const updated = await updateArticle(target.id, { slug: "Graphs" });
    expect(updated.slug).toBe("graphs-2");

    // updating only its own slug to its own current value should not append -2
    const same = await updateArticle(updated.id, { slug: "graphs-2" });
    expect(same.slug).toBe("graphs-2");
  });
});

describe("listArticles", () => {
  it("returns multiple published articles ordered by updated_at desc", async () => {
    await initDb();
    const one = await createArticle({ title: "List One", body: "1", published: true });
    const two = await createArticle({ title: "List Two", body: "2", published: true });
    const list = await listArticles();
    const slugs = list.map((a) => a.slug);
    expect(slugs).toContain(one.slug);
    expect(slugs).toContain(two.slug);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});

describe("deleteArticle", () => {
  it("removes the article", async () => {
    await initDb();
    const created = await createArticle({ title: "Doomed", body: "x", published: true });
    await deleteArticle(created.id);
    expect(await getArticleBySlug(created.slug, { includeUnpublished: true })).toBeNull();
  });
});
