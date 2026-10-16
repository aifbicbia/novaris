import holds from "@/data/solution-display-holds.json";

const held = new Map(holds.map(row => [row.problemId, row.reason]));
export function solutionDisplayHold(problemId: string): string | undefined {
  return held.get(problemId);
}
