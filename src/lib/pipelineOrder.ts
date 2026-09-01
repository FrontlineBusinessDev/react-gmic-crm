import type { PipelineStageDefinition } from "@/types";

// Stage `order` resets per `kind` (lead: 1-4, won/lost: single stage, client: 1-5),
// so a plain `order` sort interleaves lead and client stages. This ranks kinds into
// the actual lifecycle sequence first, then orders within that kind.
const KIND_RANK: Record<PipelineStageDefinition["kind"], number> = {
  lead: 0,
  won: 1,
  lost: 2,
  client: 3,
};

export function sortStagesForLifecycle(
  stages: PipelineStageDefinition[]
): PipelineStageDefinition[] {
  return [...stages].sort((a, b) => {
    const rankDiff = KIND_RANK[a.kind] - KIND_RANK[b.kind];
    if (rankDiff !== 0) return rankDiff;
    return a.order - b.order;
  });
}
