import { activeContestSetImports } from "@/data/contest-sets";
import type { SolutionRecord } from "@/data/schema";

export const solutions: SolutionRecord[] = activeContestSetImports.flatMap(
  ({ solutions: contestSolutions }) => contestSolutions,
);

const solutionsByProblem = new Map(solutions.map(solution => [solution.problemId, solution]));
const solutionsById = new Map(solutions.map(solution => [solution.id, solution]));
if (solutionsByProblem.size !== solutions.length || solutionsById.size !== solutions.length) {
  throw new Error("Duplicate solution identity in the published archive");
}

export function getSolutionForProblem(problemId: string) {
  const solution = solutionsByProblem.get(problemId);

  if (!solution) {
    throw new Error(`Missing solution for problem ${problemId}`);
  }

  return solution;
}

export function getSolutionById(id: string) {
  return solutionsById.get(id);
}
