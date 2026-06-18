import { initDb } from "../lib/db";
import {
  createProblem,
  getProblemBySlug,
  replaceTests,
  type Difficulty,
  type JudgingMode,
  type ProblemParam,
  type ProblemTest,
} from "../lib/problems";
import { createArticle, getArticleBySlug } from "../lib/articles";

interface SeedArticle {
  title: string;
  slug: string;
  pattern?: string;
  body: string;
}

const ARTICLES: SeedArticle[] = [
  {
    title: "the hash map pattern",
    slug: "the-hash-map-pattern",
    pattern: "hash-map",
    body: `the single most-used structure in interviews. a hash map gives you
**O(1) average** lookup, insert, and "have i seen this before?" — which collapses
a whole class of nested-loop problems into a single pass.

## the trigger

reach for a hash map when a brute force is "for each element, scan the rest":

- counting frequencies
- "does a complement / pair exist?"
- de-duplication and grouping
- memoizing a value you computed before

## worked example — two sum

the naive solution is two nested loops, \`O(n^2)\`. but as you walk the array
once, ask: *have i already seen \`target - x\`?*

\`\`\`python
def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
\`\`\`

one pass, \`O(n)\` time, \`O(n)\` space. the map trades memory for the inner loop.

## where to stop

know the map cold — it's *core*. the next step up is the **hash set** (membership
only) and frequency-counting tricks. don't over-reach into probabilistic structures
(bloom filters) until a problem forces it.`,
  },
];

type SeedTest = Omit<ProblemTest, "id" | "problemId" | "ordinal">;

interface SeedProblem {
  title: string;
  slug: string;
  statement: string;
  pattern?: string;
  difficulty: Difficulty;
  judgingMode: JudgingMode;
  functionName?: string;
  returnType?: string;
  params?: ProblemParam[];
  starterCode: Record<string, string>;
  tests: SeedTest[];
}

const PROBLEMS: SeedProblem[] = [
  {
    title: "two sum",
    slug: "two-sum",
    pattern: "hash-map",
    difficulty: "easy",
    judgingMode: "function",
    functionName: "twoSum",
    returnType: "int[]",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    statement:
      "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.",
    starterCode: {
      python: "def twoSum(nums, target):\n    # your code here\n    pass\n",
      javascript: "function twoSum(nums, target) {\n  // your code here\n}\n",
    },
    tests: [
      { kind: "visible", input: "[[2,7,11,15], 9]", expected: "[0,1]" },
      { kind: "visible", input: "[[3,2,4], 6]", expected: "[1,2]" },
      { kind: "hidden", input: "[[3,3], 6]", expected: "[0,1]" },
    ],
  },
  {
    title: "a plus b",
    slug: "a-plus-b",
    pattern: "math-number-theory",
    difficulty: "easy",
    judgingMode: "stdio",
    statement: "Read two space-separated integers from stdin and print their sum.",
    starterCode: {
      python: "# read two ints from stdin, print their sum\n",
      javascript: "// read two ints from stdin, print their sum\n",
    },
    tests: [
      { kind: "visible", input: "2 3\n", expected: "5\n" },
      { kind: "visible", input: "10 20\n", expected: "30\n" },
    ],
  },
];

async function main(): Promise<void> {
  await initDb();

  let created = 0;
  let skipped = 0;

  for (const p of PROBLEMS) {
    const existing = await getProblemBySlug(p.slug, { includeUnpublished: true });
    if (existing) {
      console.log(`skip ${p.slug}`);
      skipped += 1;
      continue;
    }

    const problem = await createProblem({
      title: p.title,
      slug: p.slug,
      statement: p.statement,
      pattern: p.pattern,
      difficulty: p.difficulty,
      judgingMode: p.judgingMode,
      functionName: p.functionName,
      returnType: p.returnType,
      params: p.params,
      starterCode: p.starterCode,
      published: true,
    });

    await replaceTests(
      problem.id,
      p.tests.map((t, i) => ({ ...t, ordinal: i })),
    );

    console.log(`created ${p.slug}`);
    created += 1;
  }

  for (const a of ARTICLES) {
    const existing = await getArticleBySlug(a.slug, { includeUnpublished: true });
    if (existing) {
      console.log(`skip article ${a.slug}`);
      skipped += 1;
      continue;
    }
    await createArticle({
      title: a.title,
      slug: a.slug,
      body: a.body,
      pattern: a.pattern,
      published: true,
    });
    console.log(`created article ${a.slug}`);
    created += 1;
  }

  console.log(`seed complete: ${created} created, ${skipped} skipped`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
