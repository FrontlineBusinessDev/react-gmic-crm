# react-gmic-crm

## Codebase graph reference

This repo has a generated code-structure graph produced by the `graphify` CLI, stored (untracked) in `graphify-out/` at the repo root. It maps 706 nodes (files, symbols, dependencies) and 703 edges across 108 communities — built from commit `608df84c` on 2026-09-01.

Consult it before re-deriving codebase structure by hand:

- `graphify-out/GRAPH_REPORT.md` — human-readable summary: community hubs, "god nodes" (most-connected symbols, e.g. `react`, `Inventory()`, `Financial()`), import-cycle check (none found as of the last build), knowledge gaps (isolated/weakly-connected nodes), and suggested exploration questions.
- `graphify-out/graph.json` — raw node/edge graph data.
- `graphify-out/graph.html` — interactive visualization of the graph.

**Staleness check:** compare `git rev-parse HEAD` against the "Built from commit" line at the top of `GRAPH_REPORT.md`. If the repo has moved on, refresh with:

```bash
graphify update .
```

(no API cost, per the report). Use `graphify query` to explore isolated/omitted nodes not covered in the report's summary.
