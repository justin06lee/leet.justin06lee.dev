export type PatternKind = "structure" | "technique";
export type Tier = "core" | "intermediate" | "stretch";

export interface Pattern {
  key: string;
  label: string;
  kind: PatternKind;
  tier: Tier;
}

export const PATTERNS: Pattern[] = [
  // ── Part 1 — Data Structures ──────────────────────────────────────────
  // Core
  { key: "array", label: "array / dynamic array", kind: "structure", tier: "core" },
  { key: "string", label: "string", kind: "structure", tier: "core" },
  { key: "hash-map", label: "hash map / dictionary", kind: "structure", tier: "core" },
  { key: "hash-set", label: "hash set", kind: "structure", tier: "core" },
  { key: "linked-list", label: "linked list (singly & doubly)", kind: "structure", tier: "core" },
  { key: "stack", label: "stack (LIFO)", kind: "structure", tier: "core" },
  { key: "queue", label: "queue (FIFO)", kind: "structure", tier: "core" },
  { key: "deque", label: "deque (double-ended)", kind: "structure", tier: "core" },
  { key: "heap", label: "heap / priority queue", kind: "structure", tier: "core" },
  { key: "binary-tree", label: "binary tree", kind: "structure", tier: "core" },
  { key: "bst", label: "binary search tree (BST)", kind: "structure", tier: "core" },
  { key: "trie", label: "trie (prefix tree)", kind: "structure", tier: "core" },
  { key: "graph", label: "graph (adjacency list / matrix)", kind: "structure", tier: "core" },
  { key: "matrix", label: "matrix / 2D grid", kind: "structure", tier: "core" },
  // Intermediate
  { key: "union-find", label: "union-find / disjoint set union", kind: "structure", tier: "intermediate" },
  { key: "monotonic-stack", label: "monotonic stack", kind: "structure", tier: "intermediate" },
  { key: "monotonic-deque", label: "monotonic deque", kind: "structure", tier: "intermediate" },
  { key: "balanced-bst", label: "balanced BST (AVL / red-black)", kind: "structure", tier: "intermediate" },
  { key: "ordered-container", label: "ordered / sorted container", kind: "structure", tier: "intermediate" },
  { key: "lru-cache", label: "LRU / LFU cache", kind: "structure", tier: "intermediate" },
  { key: "segment-tree", label: "segment tree", kind: "structure", tier: "intermediate" },
  { key: "fenwick-tree", label: "fenwick tree / binary indexed tree", kind: "structure", tier: "intermediate" },
  // Stretch
  { key: "segment-tree-lazy", label: "segment tree with lazy propagation", kind: "structure", tier: "stretch" },
  { key: "sparse-table", label: "sparse table", kind: "structure", tier: "stretch" },
  { key: "bloom-filter", label: "bloom filter", kind: "structure", tier: "stretch" },
  { key: "b-tree", label: "b-tree / b+ tree", kind: "structure", tier: "stretch" },
  { key: "skip-list", label: "skip list", kind: "structure", tier: "stretch" },
  { key: "kd-tree", label: "k-d tree", kind: "structure", tier: "stretch" },

  // ── Part 2 — Techniques & Patterns ────────────────────────────────────
  // Core
  { key: "two-pointers-opposite", label: "two pointers — opposite ends", kind: "technique", tier: "core" },
  { key: "two-pointers-fast-slow", label: "two pointers — fast/slow", kind: "technique", tier: "core" },
  { key: "sliding-window", label: "sliding window", kind: "technique", tier: "core" },
  { key: "prefix-sums", label: "prefix sums (1D & 2D)", kind: "technique", tier: "core" },
  { key: "binary-search", label: "binary search on a sorted array", kind: "technique", tier: "core" },
  { key: "binary-search-answer", label: "binary search on the answer / search space", kind: "technique", tier: "core" },
  { key: "sorting", label: "sorting + custom comparators", kind: "technique", tier: "core" },
  { key: "hashing-counting", label: "hashing for counting & grouping", kind: "technique", tier: "core" },
  { key: "recursion", label: "recursion", kind: "technique", tier: "core" },
  { key: "tree-traversal", label: "tree traversals", kind: "technique", tier: "core" },
  { key: "graph-dfs", label: "graph DFS", kind: "technique", tier: "core" },
  { key: "graph-bfs", label: "graph BFS", kind: "technique", tier: "core" },
  { key: "backtracking", label: "backtracking", kind: "technique", tier: "core" },
  { key: "dynamic-programming", label: "dynamic programming", kind: "technique", tier: "core" },
  // DP sub-patterns (core)
  { key: "dp-1d", label: "1D DP", kind: "technique", tier: "core" },
  { key: "dp-2d", label: "2D / grid DP", kind: "technique", tier: "core" },
  { key: "knapsack", label: "knapsack family", kind: "technique", tier: "core" },
  { key: "dp-interval", label: "interval DP", kind: "technique", tier: "core" },
  { key: "dp-subsequence", label: "DP on subsequences", kind: "technique", tier: "core" },
  { key: "dp-tree", label: "DP on trees", kind: "technique", tier: "core" },
  { key: "dp-bitmask", label: "bitmask DP", kind: "technique", tier: "core" },
  { key: "dp-state-machine", label: "state-machine DP", kind: "technique", tier: "core" },
  { key: "dp-digit", label: "digit DP", kind: "technique", tier: "core" },
  // Intermediate
  { key: "greedy", label: "greedy", kind: "technique", tier: "intermediate" },
  { key: "divide-and-conquer", label: "divide and conquer", kind: "technique", tier: "intermediate" },
  { key: "quickselect", label: "quickselect", kind: "technique", tier: "intermediate" },
  { key: "topological-sort", label: "topological sort", kind: "technique", tier: "intermediate" },
  { key: "dijkstra", label: "dijkstra's", kind: "technique", tier: "intermediate" },
  { key: "bellman-ford", label: "bellman-ford", kind: "technique", tier: "intermediate" },
  { key: "floyd-warshall", label: "floyd-warshall", kind: "technique", tier: "intermediate" },
  { key: "mst", label: "kruskal's / prim's (MST)", kind: "technique", tier: "intermediate" },
  { key: "bit-manipulation", label: "bit manipulation", kind: "technique", tier: "intermediate" },
  { key: "intervals", label: "intervals", kind: "technique", tier: "intermediate" },
  { key: "line-sweep", label: "line sweep / sweep line", kind: "technique", tier: "intermediate" },
  { key: "cyclic-sort", label: "cyclic sort", kind: "technique", tier: "intermediate" },
  { key: "dutch-national-flag", label: "dutch national flag / 3-way partition", kind: "technique", tier: "intermediate" },
  { key: "boyer-moore", label: "boyer-moore majority vote", kind: "technique", tier: "intermediate" },
  { key: "two-heaps", label: "two heaps", kind: "technique", tier: "intermediate" },
  { key: "in-place-matrix", label: "in-place matrix ops", kind: "technique", tier: "intermediate" },
  { key: "math-number-theory", label: "math / number theory basics", kind: "technique", tier: "intermediate" },
  // Stretch
  { key: "trie-dfs", label: "trie + DFS combo", kind: "technique", tier: "stretch" },
  { key: "string-matching", label: "string matching (KMP / Z / Rabin-Karp)", kind: "technique", tier: "stretch" },
  { key: "manacher", label: "manacher's algorithm", kind: "technique", tier: "stretch" },
  { key: "meet-in-the-middle", label: "meet in the middle", kind: "technique", tier: "stretch" },
  { key: "lca-binary-lifting", label: "LCA via binary lifting / euler tour", kind: "technique", tier: "stretch" },
  { key: "reservoir-sampling", label: "reservoir sampling", kind: "technique", tier: "stretch" },
  { key: "a-star", label: "a* search", kind: "technique", tier: "stretch" },
];

const BY_KEY = new Map(PATTERNS.map((p) => [p.key, p]));

export function getPattern(key: string): Pattern | undefined {
  return BY_KEY.get(key);
}
