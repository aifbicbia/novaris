import "server-only";
import { problems, type Problem } from "@/data/problems";
import { activeContestSetImports } from "@/data/contest-sets";

// Reuse the canonical public records without changing the protected data module.
// These indexes are built once per server module and never reach the browser.
const bySlug = new Map(problems.map((problem) => [problem.slug, problem] as const));
const byId = new Map(problems.map((problem) => [problem.id, problem] as const));
const byPaper = new Map<string, Problem[]>();
const byRecordPaper = new Map<string, Problem[]>();
const paperIdByProblem = new Map<string, string>();
const byContestYear = new Map<string, Problem[]>();
const programmingPaperLabels = new Map(activeContestSetImports
  .filter(({ data }) => data.subject === "CS")
  .map(({ id, data }) => {
    const edition = "edition" in data && typeof data.edition === "string"
      ? data.edition.replace(/ Contest$/, "") : "";
    return [id, `${data.year} ${data.contest}${edition ? ` ${edition}` : ""}`] as const;
  }));
// Published registry membership works for both modern and historical ID forms.
for (const { id: paperId, data } of activeContestSetImports) {
  const records = data.problems.map(({ id }) => {
    const problem = byId.get(id);
    if (!problem) throw new Error(`Missing published problem: ${id}`);
    if (paperIdByProblem.has(id)) throw new Error(`Duplicate published problem: ${id}`);
    paperIdByProblem.set(id, paperId);
    return problem;
  });
  byRecordPaper.set(paperId, records);
}
for (const problem of problems) {
  const contestYear = `${problem.contest}\u0000${problem.year}`;
  const paperKey = `${contestYear}\u0000${problem.division}`;
  const paper = byPaper.get(paperKey);
  if (paper) paper.push(problem);
  else byPaper.set(paperKey, [problem]);
  const year = byContestYear.get(contestYear);
  if (year) year.push(problem);
  else byContestYear.set(contestYear, [problem]);
}

export function getProblemBySlug(slug: string) {
  return bySlug.get(slug);
}

export function getPaperIdForProblem(problemId: string) {
  return paperIdByProblem.get(problemId);
}

// Task titles may be original names; the actual round comes from its registry.
export function getPaperLabelForProblem(problem: Pick<Problem, "id" | "subject" | "year" | "contest">) {
  return (problem.subject === "CS" ? programmingPaperLabels.get(paperIdByProblem.get(problem.id) ?? problem.id) : undefined)
    ?? `${problem.year} ${problem.contest}`;
}

export function getProblemsForPaper(contest: string, year: number, division?: string, problemId?: string) {
  // Callers may supply either a real problem ID or its published paper ID.
  if (problemId) return byRecordPaper.get(paperIdByProblem.get(problemId) ?? problemId) ?? [];
  const key = `${contest}\u0000${year}`;
  return division
    ? byPaper.get(`${key}\u0000${division}`) ?? []
    : byContestYear.get(key) ?? [];
}

export function getRelatedProblems(problem: Problem) {
  const explicit = problem.relatedProblemIds
    .map((id) => byId.get(id))
    .filter((candidate): candidate is Problem => Boolean(candidate));
  if (explicit.length) return explicit.slice(0, 3);
  return problems.filter((candidate) =>
    candidate.id !== problem.id && (
      candidate.subject === problem.subject ||
      candidate.topic === problem.topic ||
      candidate.difficulty === problem.difficulty
    ),
  ).slice(0, 3);
}
