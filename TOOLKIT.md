# The LeetCode Toolkit

Every data structure and technique worth knowing for interviews — tiered so you know where to stop.

**How to read the tiers:**
- **Core** — know cold, implement from memory, instant recognition. Non-negotiable.
- **Intermediate** — commonly tested at strong companies. You should recognize the trigger and be able to implement with light effort.
- **Stretch (your 1.5× safety margin)** — know they *exist*, know roughly *when* they apply, be able to learn one in an evening if a problem demands it. Don't grind these.

Anything past the Stretch tier is competitive-programming territory. You can safely ignore it until a specific problem forces your hand.

---

## Part 1 — Data Structures

### Core
- **Array / dynamic array** — contiguous, O(1) index, O(n) mid-insert. Your default container.
- **String** — array of chars; know whether it's mutable in your language.
- **Hash map / dictionary** — O(1) avg lookup/insert. The single most-used structure: counting, "have I seen this," index lookups, memoization.
- **Hash set** — O(1) membership. Dedup, visited-tracking.
- **Linked list (singly & doubly)** — O(1) insert/delete given the node, no random access. Pointer-manipulation problems, LRU internals.
- **Stack (LIFO)** — matching/parsing, monotonic stack, iterative DFS, undo.
- **Queue (FIFO)** — BFS, scheduling.
- **Deque (double-ended)** — sliding-window min/max, BFS variants.
- **Heap / priority queue** — O(log n) push/pop, O(1) peek. Kth-largest, merge-k, Dijkstra, scheduling.
- **Binary tree** — hierarchical; the home of traversal problems.
- **Binary search tree (BST)** — ordered; O(log n) search/insert when balanced.
- **Trie (prefix tree)** — prefix queries, autocomplete, word search.
- **Graph (adjacency list / matrix)** — nodes + edges; substrate for a huge problem class.
- **Matrix / 2D grid** — grids, DP tables, flood fill.

### Intermediate
- **Union-Find / Disjoint Set Union** (path compression + union by rank) — connectivity, cycle detection, grouping, Kruskal's. Near-O(1).
- **Monotonic stack** — next greater/smaller element, largest rectangle in histogram, stock span.
- **Monotonic deque** — sliding-window min/max in O(n).
- **Balanced BST (AVL / Red-Black)** — you rarely implement it, but know your language's ordered map/set (Java `TreeMap`, C++ `std::map`) for "ordered + dynamic" queries.
- **Ordered / sorted container** — sorted order with fast insert/delete/search (e.g. Python `sortedcontainers`).
- **LRU / LFU cache** (hashmap + doubly linked list) — classic design question.
- **Segment tree** — range queries (sum/min/max) + point updates in O(log n).
- **Fenwick tree / Binary Indexed Tree (BIT)** — prefix sums with updates in O(log n); lighter than a segment tree.

### Stretch (1.5× safety margin)
- **Segment tree with lazy propagation** — efficient *range* updates.
- **Sparse table** — static range min/max (RMQ) in O(1) after O(n log n) build.
- **Bloom filter** — probabilistic membership; shows up in systems-flavored design talk.
- **B-tree / B+ tree** (conceptual) — databases & filesystems; design discussions only.
- **Skip list** — probabilistic ordered structure; an alternative to a balanced BST.
- **k-d tree** — spatial / nearest-neighbor queries (rare).
- *Beyond here* (link-cut trees, persistent structures, heavy-light decomposition): competitive only. Know the names, skip the rest.

---

## Part 2 — Techniques & Patterns

### Core
- **Two pointers — opposite ends** — sorted-array pair sums, palindrome checks, container problems.
- **Two pointers — fast/slow** — cycle detection (Floyd's), find middle of list.
- **Sliding window** (fixed & variable size) — subarray/substring under a constraint.
- **Prefix sums** (1D & 2D) — range-sum queries; pair with a hashmap for "subarray sum equals k."
- **Binary search on a sorted array** — the basic lookup.
- **Binary search on the answer / search space** — "minimize the max," "can we do it in X?"; works when there's a monotonic predicate.
- **Sorting + custom comparators** — preprocessing; many problems collapse once sorted.
- **Hashing for counting & grouping** — frequency maps, anagram grouping, group-by.
- **Recursion** — substrate for trees, backtracking, divide & conquer.
- **Tree traversals** — DFS (pre/in/post-order) and BFS/level-order; know iterative versions.
- **Graph DFS** — connectivity, path-finding, cycle detection.
- **Graph BFS** — shortest path in *unweighted* graphs, level expansion, multi-source BFS.
- **Backtracking** — permutations, combinations, subsets, N-queens, sudoku, constraint search.
- **Dynamic programming** — overlapping subproblems + optimal substructure. (Sub-patterns below.)

#### DP sub-patterns (because "DP" alone is too coarse)
- **1D DP** — climbing stairs, house robber, Kadane's (max subarray).
- **2D / grid DP** — unique paths, edit distance, longest common subsequence.
- **Knapsack family** — 0/1, unbounded, subset-sum, partition-equal-subset.
- **Interval DP** — matrix-chain, burst balloons.
- **DP on subsequences** — LIS (and its O(n log n) binary-search version).
- **DP on trees** — subtree aggregation.
- **Bitmask DP** — small-n state compression (e.g. TSP-style).
- **State-machine DP** — stock buy/sell problems.
- **Digit DP** — counting numbers with a property (stretch).
- Note: know both **top-down (memoization)** and **bottom-up (tabulation)**.

### Intermediate
- **Greedy** — local optimum → global optimum (interval scheduling, Huffman). Learn to *spot* when greedy is valid vs. when it silently fails.
- **Divide and conquer** — merge sort, the general pattern.
- **Quickselect** — kth element in average O(n).
- **Topological sort** (Kahn's BFS or DFS) — DAG ordering, course schedule, dependency resolution.
- **Dijkstra's** — shortest path, weighted, non-negative edges.
- **Bellman-Ford** — shortest path with negative edges; detects negative cycles.
- **Floyd-Warshall** — all-pairs shortest path (small graphs).
- **Kruskal's / Prim's** — minimum spanning tree (Kruskal's pairs with Union-Find).
- **Bit manipulation** — XOR tricks, masks, single-number, subset enumeration via bits, power-of-two checks.
- **Intervals** — merge/insert/overlap; sort by start, then sweep.
- **Line sweep / sweep line** — sort events, process in order (meeting rooms, skyline).
- **Cyclic sort** — placing numbers 1..n in place; find missing/duplicate.
- **Dutch national flag / 3-way partition** — sort colors, partition around a pivot.
- **Boyer-Moore majority vote** — majority element in O(1) space.
- **Two heaps** — running median of a stream.
- **In-place matrix ops** — rotate, spiral, transpose.
- **Math / number theory basics** — Euclid's GCD/LCM, sieve of Eratosthenes, modular arithmetic, fast (binary) exponentiation.

### Stretch (1.5× safety margin)
- **Trie + DFS combo** — word search II, prefix-heavy search.
- **String matching** — KMP, Z-algorithm, Rabin-Karp (pattern search in O(n)).
- **Manacher's algorithm** — longest palindromic substring in O(n) (the expand-around-center / DP version usually suffices).
- **Meet in the middle** — split the search space, 2^(n/2).
- **LCA via binary lifting / Euler tour** — tree ancestor queries.
- **Reservoir sampling** — uniform sample from a stream of unknown length.
- **A\* search** — heuristic pathfinding (rare in interviews).
- *Beyond here* (max-flow / min-cut, bipartite matching, Mo's algorithm, suffix automata): top-tier or competitive only. Recognize the name, don't pre-study.

---

## The honest priority order
1. Make every **Core** structure and technique automatic. This alone clears the large majority of interviews.
2. Add **Intermediate** until your weak-pattern queue is empty.
3. Touch **Stretch** only when a specific problem or company target demands it — never as routine grind.
