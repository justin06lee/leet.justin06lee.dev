import { describe, it, expect } from "vitest";
import { extractHeadings, excerpt } from "./markdown";

describe("extractHeadings", () => {
  it("pulls ATX headings with rehype-slug-compatible ids", () => {
    const md = "# Two Pointers\n\nbody\n\n## The Trigger!\n\nmore";
    expect(extractHeadings(md)).toEqual([
      { id: "two-pointers", text: "Two Pointers", depth: 1 },
      { id: "the-trigger", text: "The Trigger!", depth: 2 },
    ]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const md = "## real\n\n```py\n# not a heading\n## also not\n```\n\n## also real";
    expect(extractHeadings(md).map((h) => h.text)).toEqual(["real", "also real"]);
  });

  it("handles tilde fences too", () => {
    const md = "~~~\n# hidden\n~~~\n\n## shown";
    expect(extractHeadings(md).map((h) => h.text)).toEqual(["shown"]);
  });

  it("dedupes repeated slugs the way github-slugger does", () => {
    const md = "## notes\n\n## notes\n\n## notes";
    expect(extractHeadings(md).map((h) => h.id)).toEqual(["notes", "notes-1", "notes-2"]);
  });

  it("strips inline emphasis, code, and links from the label", () => {
    const md = "## the `heap` [trick](/x) is **fast**";
    const [h] = extractHeadings(md);
    expect(h.text).toBe("the heap trick is fast");
    expect(h.id).toBe("the-heap-trick-is-fast");
  });

  it("respects maxDepth and skips deeper headings", () => {
    const md = "# a\n\n## b\n\n### c\n\n#### d";
    expect(extractHeadings(md, 2).map((h) => h.text)).toEqual(["a", "b"]);
  });

  it("ignores a hash that isn't a heading", () => {
    expect(extractHeadings("#nospace\n\ntext #hash")).toEqual([]);
  });

  it("returns an empty list for empty markdown", () => {
    expect(extractHeadings("")).toEqual([]);
  });
});

describe("excerpt", () => {
  it("flattens markdown into plain prose", () => {
    expect(excerpt("# title\n\nthe **two pointer** [trick](/x) is `fast`.")).toBe(
      "the two pointer trick is fast.",
    );
  });

  it("drops fenced code so the preview is prose, not source", () => {
    expect(excerpt("intro line.\n\n```ts\nconst x = 1;\n```\n\noutro.")).toBe(
      "intro line. outro.",
    );
  });

  it("truncates on a word boundary with an ellipsis", () => {
    const out = excerpt("alpha beta gamma delta", 11);
    expect(out).toBe("alpha beta…");
  });

  it("leaves short text untouched", () => {
    expect(excerpt("short.", 100)).toBe("short.");
  });

  it("returns an empty string when there is no prose", () => {
    expect(excerpt("```js\ncode();\n```")).toBe("");
    expect(excerpt("")).toBe("");
  });
});
