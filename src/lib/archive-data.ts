import { solutionDisplayHold } from "@/lib/solution-availability";
import "server-only";
import { problems, contestCompletionSummaries } from "@/data/problems";
import { activeContestSetImports } from "@/data/contest-sets";
import { problemPreview, type ArchiveRow } from "@/lib/archive";
import { canDisplayStatement, getContentQuality } from '@/lib/content-quality';
import { getPaperLabelForProblem } from '@/lib/problem-index';

// Archive search only needs a case-insensitive word/math-token index. Keeping
// one copy of each token preserves topic, title, source, statement-word and
// common compact-expression searches while avoiding repeated punctuation and
// TeX whitespace in the client Flight payload. The original statement remains
// server-side; the detail page displays it only with recorded permission.
function searchIndex(values: unknown[]) {
  const tokens = values.flatMap((value) =>
    String(value ?? '').toLocaleLowerCase().match(
      /(?:-[\p{N}]+|[\p{L}\p{N}]+(?:[+*/=^_.-]+[\p{L}\p{N}]+)*)/gu,
    ) ?? [],
  );
  return [...new Set(tokens)].join(' ');
}

// Most rows already encode their paper ID. Only exceptions need another
// compact client field; the full published registry remains server-side.
const atypicalPaperIds = new Map<string, string>();
for (const { id: paperId, data } of activeContestSetImports) {
  for (const { id, problemNumber } of data.problems) {
    if (id !== `${paperId}-p${problemNumber}`) atypicalPaperIds.set(id, paperId);
  }
}

export const archiveRows: ArchiveRow[] = problems.map((problem) => ({
  id: problem.id,
  slug: problem.slug,
  title: problem.title,
  subject: problem.subject,
  contest: problem.contest,
  year: problem.year,
  problemNumber: problem.problemNumber,
  topic: problem.topic,
  subtopic: problem.subtopic,
  difficulty: problem.difficulty,
  verificationStatus: getContentQuality(problem.id).mathReview === 'independent-check-recorded' ? 'verified' : 'needs verification',
  readingStatus: getContentQuality(problem.id).reading,
  problemTextStatus: problem.problemTextStatus,
  officialSourceName: problem.officialSourceName,
  officialSourceUrl: problem.officialSourceUrl,
  ...(problem.problemTextStatus === "included" && canDisplayStatement(problem.id)
    ? { preview: problemPreview(problem.problemText) || "Open this problem to read the statement and any accompanying diagram." }
    : {}),
  ...(solutionDisplayHold(problem.id) ? { reviewLabel: "Solution under review", preview: "The stored solution is withheld while a recorded source or answer discrepancy is reviewed. Open the original source." } : {}),
  keyIdeas: problem.solution.keyIdeas,
  searchText: searchIndex([
    problem.title,
    problem.subject === "CS" ? getPaperLabelForProblem(problem) : "",
    problem.contest,
    problem.year,
    problem.problemNumber,
    problem.topic,
    problem.subtopic,
    problem.sourceName,
    canDisplayStatement(problem.id) ? problem.problemText : "",
    ...problem.solution.keyIdeas,
  ]),
  ...(atypicalPaperIds.has(problem.id) ? { paperId: atypicalPaperIds.get(problem.id) } : {}),
}));

export const archiveStats = {
  problems: problems.length,
  solutions: problems.filter((problem) => problem.solution).length,
  availableSolutions: problems.filter(problem => !solutionDisplayHold(problem.id)).length,
  solutionDisplayHolds: problems.filter(problem => Boolean(solutionDisplayHold(problem.id))).length,
  sets: contestCompletionSummaries.length,
  contests: [...new Set(problems.map((problem) => problem.contest))].sort(),
  topics: [...new Set(problems.map((problem) => problem.topic))].sort(),
};

// Only identities and readable labels reach the paper filter. Statements,
// solutions, review evidence and the complete registry stay on the server.
export const archivePaperLabels = activeContestSetImports.map(({ id, data }) => {
  const problem = problems.find(problem => problem.id === data.problems[0].id)!;
  let label = getPaperLabelForProblem(problem);
  const edition = "edition" in data && typeof data.edition === "string"
    ? data.edition.replace(/ Contest$/, "") : "";
  if (data.subject !== "CS" && edition && edition !== "annual" && !data.contest.endsWith(` ${edition}`)) {
    label += ` ${edition}`;
  }
  return { id, label };
});

export const contestCoverage = archiveStats.contests.map((contest) => {
  const rows = problems.filter((problem) => problem.contest === contest);
  const years = [...new Set(rows.map((problem) => problem.year))].sort(
    (a, b) => b - a,
  );
  return {
    contest,
    subject: rows[0].subject,
    count: rows.length,
    years,
    latest: years[0],
    // Count published administrations directly; historical problem IDs vary.
    sets: activeContestSetImports.filter(({ data }) => data.contest === contest).length,
    href: `/archive?contest=${encodeURIComponent(contest)}`,
  };
});
export const popularArchiveTopics = Object.entries(
  problems.reduce<Record<string, number>>((counts, problem) => {
    counts[problem.topic] = (counts[problem.topic] ?? 0) + 1;
    return counts;
  }, {}),
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([topic]) => topic);
